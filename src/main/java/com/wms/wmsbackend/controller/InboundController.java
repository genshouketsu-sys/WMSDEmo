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

    @GetMapping("/list")
    public List<InboundOrder> list() {
        return inboundMapper.findAll();
    }

    @PostMapping("/create")
    public int create(@RequestBody InboundOrder order) {
        if (order.getStatus() == null) {
            order.setStatus("Pending");
        }
        return inboundMapper.insert(order);
    }

    @PostMapping("/audit/{id}")
    public int audit(@PathVariable Long id) {
        return inboundMapper.updateStatus(id, "Audited");
    }
}
