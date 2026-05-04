package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.mapper.ProductMapper;
import com.wms.wmsbackend.mapper.ScanLogMapper;
import com.wms.wmsbackend.service.RestockPredictionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private ScanLogMapper scanLogMapper;

    @Autowired
    private RestockPredictionService predictionService;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalActiveSKUs", productMapper.countActiveSKUs());
        stats.put("scansToday", scanLogMapper.countScansToday());
        stats.put("lowStockAlerts", predictionService.getRestockSuggestions().size());
        return ResponseEntity.ok(stats);
    }
}
