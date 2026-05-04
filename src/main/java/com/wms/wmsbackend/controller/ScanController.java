package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.config.ScanWebSocketHandler;
import jakarta.annotation.security.PermitAll;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;
import java.util.List;

@RestController
@RequestMapping("/api/scan")
@CrossOrigin(origins = "*") 
public class ScanController {

    @Autowired
    private ScanWebSocketHandler scanWebSocketHandler;

    @Autowired
    private com.wms.wmsbackend.mapper.ScanLogMapper scanLogMapper;

    @Autowired
    private com.wms.wmsbackend.mapper.ProductMapper productMapper;

    @Autowired
    private com.wms.wmsbackend.service.ExternalProductService externalProductService;

    @PermitAll
    @PostMapping("/push")
    public ResponseEntity<Map<String, Object>> pushScanData(@RequestBody Map<String, String> payload) {
        String barcode = payload.get("barcode");
        String userId = payload.get("userId");
        System.out.println("Received scan push: barcode=" + barcode + ", userId=" + userId);

        // Resolve Product Name and Image
        String productName = "Unknown Product";
        String productImage = "";

        com.wms.wmsbackend.entity.Product localProduct = productMapper.findByBarcode(barcode);
        if (localProduct != null) {
            productName = localProduct.getName();
            // Assuming localProduct has image or just generic
        } else {
            Map<String, String> yahooData = externalProductService.fetchFromYahoo(barcode);
            productName = yahooData.get("name");
            productImage = yahooData.get("image");
        }

        try {
            scanLogMapper.insert(barcode, userId);
        } catch (Exception e) {
            System.err.println("Failed to log scan: " + e.getMessage());
        }

        String targetClientId = "pc_" + userId;
        
        // Send JSON payload to PC
        Map<String, String> wsMessage = new HashMap<>();
        wsMessage.put("barcode", barcode);
        wsMessage.put("name", productName);
        wsMessage.put("image", productImage);
        
        try {
            String jsonMessage = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(wsMessage);
            scanWebSocketHandler.sendMessageToClient(targetClientId, jsonMessage);
        } catch (Exception e) {
            scanWebSocketHandler.sendMessageToClient(targetClientId, barcode); // Fallback
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Relay processed with product info");
        return ResponseEntity.ok(response);
    }

    @PermitAll
    @PostMapping("/undo")
    public ResponseEntity<Map<String, Object>> undoScanData(@RequestBody Map<String, String> payload) {
        String userId = payload.get("userId");
        Map<String, Object> response = new HashMap<>();
        
        Long latestId = scanLogMapper.findLatestIdByUserId(userId);
        if (latestId != null) {
            scanLogMapper.deleteById(latestId);
            
            // Notify PC client to undo
            String targetClientId = "pc_" + userId;
            scanWebSocketHandler.sendMessageToClient(targetClientId, "UNDO_LAST_ACTION");
            
            response.put("success", true);
            response.put("message", "Last scan undone");
        } else {
            response.put("success", false);
            response.put("message", "No logs to undo");
        }
        return ResponseEntity.ok(response);
    }

    @PermitAll
    @GetMapping("/logs")
    public List<Map<String, Object>> getScanLogs() {
        return scanLogMapper.findAllLogs();
    }
}