package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.dto.RestockSuggestionDto;
import com.wms.wmsbackend.service.RestockPredictionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/predictions")
public class PredictionController {

    @Autowired
    private RestockPredictionService predictionService;

    @Autowired private com.wms.wmsbackend.service.OrderService orders;
    @Autowired private com.wms.wmsbackend.service.ProductService products;

    @org.springframework.web.bind.annotation.PostMapping("/restock/{skuCode}")
    public java.util.Map<String,Object> create(@org.springframework.web.bind.annotation.PathVariable String skuCode, java.security.Principal user) {
        var suggestion=predictionService.getRestockSuggestions().stream().filter(s -> skuCode.equals(s.getSkuCode())).findFirst().orElseThrow(() -> new IllegalArgumentException("补货建议已更新，请刷新。"));
        var product=products.getAllProducts().stream().filter(p -> skuCode.equals(p.getSkuCode())).findFirst().orElseThrow();
        var order=new com.wms.wmsbackend.entity.InboundOrder();
        order.setOrderNum("RE-"+java.util.UUID.randomUUID());order.setInType("Purchase");order.setSupplierName("待确认");
        var item=new com.wms.wmsbackend.entity.OrderItem();item.setProductId(product.getId());item.setQuantity(suggestion.getSuggestedOrderQuantity());
        order.setItems(java.util.List.of(item));orders.createInbound(order,user.getName());
        return java.util.Map.of("success",true,"orderNum",order.getOrderNum());
    }

    @GetMapping("/restock")
    public List<RestockSuggestionDto> getRestockSuggestions() {
        return predictionService.getRestockSuggestions();
    }
}
