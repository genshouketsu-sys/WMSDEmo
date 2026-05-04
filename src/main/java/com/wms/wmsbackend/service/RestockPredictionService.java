package com.wms.wmsbackend.service;

import com.wms.wmsbackend.dto.RestockSuggestionDto;
import com.wms.wmsbackend.entity.Product;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class RestockPredictionService {

    @Autowired
    private ProductService productService;

    @Autowired
    private com.wms.wmsbackend.mapper.ScanLogMapper scanLogMapper;

    public List<RestockSuggestionDto> getRestockSuggestions() {
        List<Product> products = productService.getAllProducts();
        List<RestockSuggestionDto> suggestions = new ArrayList<>();
        
        // 1. Get recent scan counts (last 14 days) to calculate REAL daily usage
        int lookbackDays = 14;
        List<Map<String, Object>> recentScans = scanLogMapper.getRecentScanCounts(lookbackDays);
        Map<String, Double> dynamicUsageMap = new java.util.HashMap<>();
        for (Map<String, Object> entry : recentScans) {
            String barcode = (String) entry.get("barcode");
            Long count = (Long) entry.get("scanCount");
            dynamicUsageMap.put(barcode, count.doubleValue() / lookbackDays);
        }

        java.time.LocalDate today = java.time.LocalDate.now();

        for (Product product : products) {
            // Priority: Dynamic Usage > Static Daily Usage > 0
            Double dailyUsage = dynamicUsageMap.getOrDefault(product.getBarcode(), 
                                product.getDailyUsage() != null ? product.getDailyUsage() : 0.0);
            
            Integer leadTime = product.getLeadTimeDays() != null ? product.getLeadTimeDays() : 7;
            Integer safetyStock = product.getSafetyStock() != null ? product.getSafetyStock() : 10;
            Integer currentStock = product.getStock() != null ? product.getStock() : 0;

            if (dailyUsage > 0.0 || currentStock <= safetyStock) {
                int reorderPoint = (int) Math.ceil((dailyUsage * leadTime) + safetyStock);

                if (currentStock <= reorderPoint) {
                    RestockSuggestionDto dto = new RestockSuggestionDto();
                    dto.setSkuCode(product.getSkuCode());
                    dto.setName(product.getName());
                    dto.setCurrentStock(currentStock);
                    dto.setDailyUsage(dailyUsage);
                    dto.setLeadTimeDays(leadTime);
                    dto.setSafetyStock(safetyStock);
                    dto.setReorderPoint(reorderPoint);

                    // Calculation
                    int suggestedOrder = (int) Math.ceil(reorderPoint - currentStock + (dailyUsage * 30)); // replenish + 30 days
                    dto.setSuggestedOrderQuantity(Math.max(suggestedOrder, safetyStock * 2));

                    int daysLeft = dailyUsage > 0 ? (int) Math.floor(currentStock / dailyUsage) : 0;
                    dto.setDaysUntilDepletion(daysLeft);
                    dto.setPredictedDepletionDate(today.plusDays(daysLeft).toString());

                    // Urgency logic
                    if (currentStock == 0) {
                        dto.setUrgency("High");
                        dto.setReason("OUT OF STOCK");
                    } else if (daysLeft <= leadTime) {
                        dto.setUrgency("High");
                        dto.setReason("Depletion within lead time.");
                    } else if (currentStock <= safetyStock) {
                        dto.setUrgency("Medium");
                        dto.setReason("Below safety stock level.");
                    } else {
                        dto.setUrgency("Low");
                        dto.setReason("Approaching reorder point.");
                    }

                    suggestions.add(dto);
                }
            }
        }
        return suggestions;
    }
}
