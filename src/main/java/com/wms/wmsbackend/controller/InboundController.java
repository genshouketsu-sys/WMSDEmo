package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.entity.InboundOrder;
import com.wms.wmsbackend.mapper.InboundMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inbound")
public class InboundController {

    @Autowired
    private InboundMapper inboundMapper;

    @Autowired private com.wms.wmsbackend.service.OrderService orders;

    @GetMapping("/list")
    public List<InboundOrder> list() {
        var result=inboundMapper.findAll();
        result.forEach(order -> order.setItems(orders.items(true, order.getId())));
        return result;
    }

    @PostMapping("/create")
    public int create(@RequestBody InboundOrder order, java.security.Principal user) {
        return orders.createInbound(order, user.getName());
    }

    @PutMapping("/{id}/items")
    public int items(@PathVariable Long id, @RequestBody java.util.List<com.wms.wmsbackend.entity.OrderItem> items) { return orders.updateItems(true, id, items); }

    @PostMapping("/audit/{id}")
    public int audit(@PathVariable Long id) {
        return orders.audit(true, id);
    }
}
