package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.entity.FinanceBill;
import com.wms.wmsbackend.mapper.FinanceMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    @Autowired
    private FinanceMapper financeMapper;

    @Autowired private com.wms.wmsbackend.service.FinanceService service;

    @GetMapping("/bills")
    public List<FinanceBill> getBills() {
        return financeMapper.findAll();
    }

    @PostMapping("/create")
    public int create(@RequestBody FinanceBill bill) {
        return service.create(bill);
    }

    @DeleteMapping("/{id}")
    public int delete(@PathVariable Long id) {
        return financeMapper.deleteById(id);
    }
}
