package com.wms.wmsbackend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class FinanceBill {
    private Long id;
    private String billNum;
    private String billType; // "Payable", "Receivable"
    private BigDecimal amount;
    private String relatedOrder; // Related Outbound/Inbound order
    private String status; // "Unpaid", "Paid", "Partial"
    private LocalDateTime createTime;
    private String remark;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getBillNum() { return billNum; }
    public void setBillNum(String billNum) { this.billNum = billNum; }
    public String getBillType() { return billType; }
    public void setBillType(String billType) { this.billType = billType; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getRelatedOrder() { return relatedOrder; }
    public void setRelatedOrder(String relatedOrder) { this.relatedOrder = relatedOrder; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
}
