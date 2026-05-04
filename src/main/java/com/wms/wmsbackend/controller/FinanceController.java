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

    @GetMapping("/bills")
    public List<FinanceBill> getBills() {
        return financeMapper.findAll();
    }

    @PostMapping("/create")
    public int create(@RequestBody FinanceBill bill) {
        if (bill.getStatus() == null) {
            bill.setStatus("Unpaid");
        }
        return financeMapper.insert(bill);
    }

    @DeleteMapping("/{id}")
    public int delete(@PathVariable Long id) {
        return financeMapper.deleteById(id);
    }
}
