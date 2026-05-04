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

    @GetMapping("/list")
    public List<OutboundOrder> list() {
        return outboundMapper.findAll();
    }

    @PostMapping("/create")
    public int create(@RequestBody OutboundOrder order) {
        if (order.getStatus() == null) {
            order.setStatus("Pending");
        }
        return outboundMapper.insert(order);
    }

    @PostMapping("/audit/{id}")
    public int audit(@PathVariable Long id) {
        return outboundMapper.updateStatus(id, "Audited");
    }

    @DeleteMapping("/{id}")
    public int delete(@PathVariable Long id) {
        return outboundMapper.deleteById(id);
    }
}
