package com.wms.wmsbackend;
import com.wms.wmsbackend.entity.*;
import com.wms.wmsbackend.mapper.*;
import com.wms.wmsbackend.security.JwtUtil;
import com.wms.wmsbackend.service.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WmsIntegrationTest {
    @Autowired RegistrationService registration;
    @Autowired UserMapper users;
    @Autowired ProductService products;
    @Autowired ProductMapper productMapper;
    @Autowired ScanService scans;
    @Autowired OrderService orders;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtUtil jwt;
    @Autowired MockMvc http;
    @Autowired RestockPredictionService predictions;
    @Autowired FinanceService finance;

    @Test
    @Transactional
    void existingUserRoleCanStayLoggedIn() throws Exception {
        registration.register("existing-user", "strong-password");
        jdbc.update("UPDATE wms_user SET role='ROLE_USER' WHERE username='existing-user'");
        String login = http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"username\":\"existing-user\",\"password\":\"strong-password\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = new com.fasterxml.jackson.databind.ObjectMapper().readTree(login).get("token").asText();
        http.perform(get("/api/user/profile").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        http.perform(get("/api/scan/logs").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    @Transactional
    void inventoryAndPermissionsAreConsistent() throws Exception {
        registration.register("owner", "strong-password-1");
        registration.register("worker", "strong-password-2");
        assertEquals("ROLE_ADMIN",users.findByUsername("owner").getRole());
        assertEquals("ROLE_OPERATOR",users.findByUsername("worker").getRole());
        assertThrows(IllegalArgumentException.class, () -> registration.register("worker","duplicate"));

        Product product = new Product();
        product.setSkuCode("TEST-1"); product.setName("Widget"); product.setBarcode("0123456789012"); product.setStock(0);
        assertTrue(products.addProduct(product));
        jdbc.update("INSERT INTO wms_scan_log(barcode,user_id,scan_time,status,product_name) " +
            "VALUES (?, 'owner', CURRENT_TIMESTAMP, 'Archived', NULL)", product.getBarcode());
        var legacyLog = scans.logs("owner").get(0);
        assertEquals("Widget", column(legacyLog, "name"));
        assertEquals("TEST-1", column(legacyLog, "skuCode"));
        assertNotNull(column(legacyLog, "time"));
        assertEquals("History", column(legacyLog, "status"));
        Product duplicate = new Product();
        duplicate.setSkuCode("TEST-2"); duplicate.setName("Duplicate"); duplicate.setBarcode(product.getBarcode());
        assertThrows(IllegalArgumentException.class, () -> products.addProduct(duplicate));

        var first=scans.push("worker",product.getBarcode(),"operation-one");
        var retry=scans.push("worker",product.getBarcode(),"operation-one");
        var second=scans.push("worker",product.getBarcode(),"operation-two");
        assertEquals(first.get("scanId"),retry.get("scanId"));
        assertEquals(2, scans.logs("worker").size());
        assertThrows(IllegalArgumentException.class, () -> scans.push("worker","other","operation-one"));
        scans.stockIn("worker",List.of((Long)first.get("scanId")));
        scans.stockIn("worker",List.of((Long)first.get("scanId")));
        assertEquals(1,productMapper.findByBarcode(product.getBarcode()).getStock());
        scans.stockIn("worker",List.of((Long)second.get("scanId")));
        assertEquals(2,productMapper.findByBarcode(product.getBarcode()).getStock());

        assertThrows(IllegalArgumentException.class, () -> products.batchInbound(List.of(product.getBarcode(),"unknown")));
        assertEquals(2,productMapper.findByBarcode(product.getBarcode()).getStock());

        OutboundOrder insufficient=new OutboundOrder();
        insufficient.setOrderNum("OUT-INSUFFICIENT");
        OrderItem tooMany=new OrderItem();tooMany.setProductId(product.getId());tooMany.setQuantity(3);
        insufficient.setItems(List.of(tooMany));
        orders.createOutbound(insufficient,"owner");
        assertThrows(IllegalArgumentException.class, () -> orders.audit(false,insufficient.getId()));
        assertEquals(2,productMapper.findByBarcode(product.getBarcode()).getStock());
        assertEquals("Pending",jdbc.queryForObject("SELECT status FROM outbound_order WHERE id=?",String.class,insufficient.getId()));

        OutboundOrder valid=new OutboundOrder();
        valid.setOrderNum("OUT-VALID");
        OrderItem two=new OrderItem();two.setProductId(product.getId());two.setQuantity(2);
        valid.setItems(List.of(two));orders.createOutbound(valid,"owner");
        orders.audit(false,valid.getId());
        orders.audit(false,valid.getId());
        assertEquals(0,productMapper.findByBarcode(product.getBarcode()).getStock());
        assertThrows(IllegalArgumentException.class, () -> orders.deleteOutbound(valid.getId()));
        assertTrue(predictions.getRestockSuggestions().stream().anyMatch(p -> p.getSkuCode().equals(product.getSkuCode()) && p.getDailyUsage()>0));
        FinanceBill bill=new FinanceBill();bill.setBillNum("FIN-1");bill.setBillType("Payable");bill.setAmount(new java.math.BigDecimal("25.50"));
        finance.create(bill);
        assertThrows(IllegalArgumentException.class, () -> finance.create(bill));
        assertEquals("Unpaid",jdbc.queryForObject("SELECT status FROM finance_bill WHERE bill_num='FIN-1'",String.class));

        http.perform(get("/api/scan/logs")).andExpect(status().isUnauthorized());
        http.perform(post("/api/scan/stock-in").header("X-Scan-Token",jwt.scanToken("worker"))
            .contentType(MediaType.APPLICATION_JSON).content("[]")).andExpect(status().isUnauthorized());
        String workerToken=jwt.generateToken(new org.springframework.security.core.userdetails.User(
            "worker",users.findByUsername("worker").getPasswordHash(),List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_OPERATOR"))));
        http.perform(post("/api/outbound/audit/"+valid.getId()).header("Authorization","Bearer "+workerToken))
            .andExpect(status().isForbidden());
        http.perform(get("/api/admin/users").header("Authorization","Bearer "+workerToken)).andExpect(status().isForbidden());
        String ownerToken=jwt.generateToken(new org.springframework.security.core.userdetails.User(
            "owner",users.findByUsername("owner").getPasswordHash(),List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"))));
        http.perform(get("/api/admin/users").header("Authorization","Bearer "+ownerToken)).andExpect(status().isOk());
        http.perform(put("/api/admin/users/"+users.findByUsername("worker").getId()+"/role")
            .header("Authorization","Bearer "+ownerToken).contentType(MediaType.APPLICATION_JSON)
            .content("{\"role\":\"ROLE_ADMIN\"}")).andExpect(status().isOk());
        assertEquals("ROLE_ADMIN",jdbc.queryForObject("SELECT role FROM wms_user WHERE username='worker'",String.class));
        assertThrows(IllegalArgumentException.class, () -> products.batchInbound(List.of("unknown")));
        String barcodeJson="[\""+product.getBarcode()+"\"]";
        http.perform(post("/api/products/batch-inbound").header("Authorization","Bearer "+ownerToken)
            .header("Idempotency-Key","test-operation-1").contentType(MediaType.APPLICATION_JSON)
            .content(barcodeJson)).andExpect(status().isOk());
        http.perform(post("/api/products/batch-inbound").header("Authorization","Bearer "+ownerToken)
            .header("Idempotency-Key","test-operation-1").contentType(MediaType.APPLICATION_JSON)
            .content(barcodeJson)).andExpect(status().isOk());
        assertEquals(1,productMapper.findByBarcode(product.getBarcode()).getStock());
    }

    private Object column(Map<String,Object> row, String name) {
        return row.entrySet().stream().filter(entry -> entry.getKey().equalsIgnoreCase(name))
            .map(Map.Entry::getValue).findFirst().orElse(null);
    }
}
