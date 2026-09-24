package com.wms.wmsbackend.service;
import com.wms.wmsbackend.entity.FinanceBill;
import com.wms.wmsbackend.mapper.FinanceMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
public class FinanceService {
    private final JdbcTemplate jdbc;
    private final FinanceMapper bills;
    public FinanceService(JdbcTemplate jdbc, FinanceMapper bills) { this.jdbc=jdbc;this.bills=bills; }
    @Transactional
    public int create(FinanceBill bill) {
        if (bill.getBillNum()==null || bill.getBillNum().isBlank() || bill.getBillNum().length()>50 ||
            !List.of("Payable","Receivable").contains(bill.getBillType()) ||
            bill.getAmount()==null || bill.getAmount().compareTo(BigDecimal.ZERO)<=0)
            throw new IllegalArgumentException("请输入有效的单号、类型和正数金额。");
        jdbc.queryForObject("SELECT id FROM wms_system_lock WHERE id=1 FOR UPDATE",Integer.class);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM finance_bill WHERE bill_num=?",Integer.class,bill.getBillNum())>0)
            throw new IllegalArgumentException("财务单号已存在。");
        bill.setStatus("Unpaid");
        return bills.insert(bill);
    }
}