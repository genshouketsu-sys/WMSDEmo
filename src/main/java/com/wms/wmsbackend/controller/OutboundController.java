package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.entity.OutboundOrder;
import com.wms.wmsbackend.mapper.OutboundMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/outbound")
public class OutboundController {

    @Autowired
    private OutboundMapper outboundMapper;

    @Autowired private com.wms.wmsbackend.service.OrderService orders;

    @GetMapping("/list")
    public List<OutboundOrder> list() {
        var result=outboundMapper.findAll();
        result.forEach(order -> order.setItems(orders.items(false, order.getId())));
        return result;
    }

    @PostMapping("/create")
    public int create(@RequestBody OutboundOrder order, java.security.Principal user) {
        return orders.createOutbound(order, user.getName());
    }

    @PutMapping("/{id}/items")
    public int items(@PathVariable Long id, @RequestBody java.util.List<com.wms.wmsbackend.entity.OrderItem> items) { return orders.updateItems(false, id, items); }

    @PostMapping("/audit/{id}")
    public int audit(@PathVariable Long id) {
        return orders.audit(false, id);
    }

    @DeleteMapping("/{id}")
    public int delete(@PathVariable Long id) {
        return orders.deleteOutbound(id);
    }
}
