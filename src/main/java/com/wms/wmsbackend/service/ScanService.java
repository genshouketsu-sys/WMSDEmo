package com.wms.wmsbackend.service;
import com.wms.wmsbackend.entity.Product;
import com.wms.wmsbackend.mapper.ProductMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Statement;
import java.util.*;

@Service
public class ScanService {
    private final JdbcTemplate jdbc;
    private final ProductMapper products;
    private final ProductService inventory;
    private final ExternalProductService external;
    public ScanService(JdbcTemplate jdbc, ProductMapper products, ProductService inventory, ExternalProductService external) {
        this.jdbc=jdbc; this.products=products; this.inventory=inventory; this.external=external;
    }
    private void lock() { jdbc.queryForObject("SELECT id FROM wms_system_lock WHERE id=1 FOR UPDATE",Integer.class); }
    @Transactional
    public Map<String,Object> push(String user, String barcode, String requestId) {
        if (barcode == null || barcode.isBlank() || barcode.length()>100) throw new IllegalArgumentException("请输入有效条码。");
        if (requestId != null && !requestId.matches("[a-zA-Z0-9_-]{1,64}")) throw new IllegalArgumentException("Invalid scan request ID");
        lock();
        if (requestId != null) {
            var old=jdbc.queryForList("SELECT id, barcode, product_name FROM wms_scan_log WHERE user_id=? AND request_id=?",user,requestId);
            if (!old.isEmpty()) {
                if (!barcode.equals(old.get(0).get("barcode"))) throw new IllegalArgumentException("同一扫描标识不能用于不同条码。");
                return Map.of("success",true,"scanId",old.get(0).get("id"),"name",Objects.toString(old.get(0).get("product_name"),"Unknown Product"),"found",products.countBarcode(barcode,null)==1);
            }
        }
        if (products.countBarcode(barcode,null)>1) throw new IllegalArgumentException("条码对应多个商品，请先修正商品资料。");
        Product product=products.findByBarcode(barcode);
        Map<String,String> info=product==null ? external.fetchFromYahoo(barcode) : Map.of("name",product.getName(),"image","");
        KeyHolder holder=new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement=connection.prepareStatement("INSERT INTO wms_scan_log(barcode,user_id,scan_time,status,request_id,product_name,product_image) VALUES(?,?,CURRENT_TIMESTAMP,'Pending',?,?,?)",new String[]{"id"});
            statement.setString(1,barcode);statement.setString(2,user);statement.setString(3,requestId);
            statement.setString(4,info.get("name"));statement.setString(5,info.get("image"));return statement;
        },holder);
        return Map.of("success",true,"scanId",holder.getKey().longValue(),"name",info.get("name"),"found",product!=null);
    }
    public List<Map<String,Object>> logs(String user) {
        return jdbc.queryForList("SELECT sl.id AS scanId, sl.barcode, p.sku_code AS skuCode, " +
            "COALESCE(NULLIF(sl.product_name,''), p.name, sl.barcode) AS name, sl.scan_time AS time, " +
            "CASE WHEN sl.status='Pending' THEN 'Verified' WHEN sl.status='Archived' THEN 'History' ELSE sl.status END AS status " +
            "FROM wms_scan_log sl LEFT JOIN product p ON p.barcode=sl.barcode " +
            "WHERE sl.user_id=? AND sl.status IN ('Pending','Stocked','Archived') ORDER BY sl.id DESC",user);
    }
    @Transactional
    public boolean undo(String user) {
        lock();
        var ids=jdbc.queryForList("SELECT id FROM wms_scan_log WHERE user_id=? AND status='Pending' ORDER BY id DESC LIMIT 1",Long.class,user);
        if (ids.isEmpty()) return false;
        jdbc.update("UPDATE wms_scan_log SET status='Dismissed' WHERE id=?",ids.get(0));
        return true;
    }
    @Transactional
    public void stockIn(String user, List<Long> ids) {
        if (ids == null || ids.isEmpty() || ids.stream().anyMatch(Objects::isNull)) throw new IllegalArgumentException("请选择扫描记录。");
        lock();
        List<String> barcodes=new ArrayList<>();
        List<Long> pending=new ArrayList<>();
        for (Long id : new TreeSet<>(ids)) {
            var rows=jdbc.queryForList("SELECT barcode,status FROM wms_scan_log WHERE id=? AND user_id=?",id,user);
            if (rows.isEmpty()) throw new IllegalArgumentException("扫描记录不存在或无权处理。");
            String status=rows.get(0).get("status").toString();
            if ("Stocked".equals(status)) continue;
            if (!"Pending".equals(status)) throw new IllegalArgumentException("扫描记录已撤销。");
            barcodes.add(rows.get(0).get("barcode").toString());pending.add(id);
        }
        if (!barcodes.isEmpty()) inventory.batchInbound(barcodes);
        for (Long id : pending) jdbc.update("UPDATE wms_scan_log SET status='Stocked' WHERE id=?",id);
    }
    @Transactional
    public void dismiss(String user, List<Long> ids) {
        if (ids == null || ids.stream().anyMatch(Objects::isNull)) throw new IllegalArgumentException("请选择扫描记录。");
        lock();
        for (Long id : ids) jdbc.update("UPDATE wms_scan_log SET status=CASE WHEN status='Stocked' THEN 'Hidden' ELSE 'Dismissed' END WHERE id=? AND user_id=? AND status IN ('Pending','Stocked')",id,user);
    }
}
