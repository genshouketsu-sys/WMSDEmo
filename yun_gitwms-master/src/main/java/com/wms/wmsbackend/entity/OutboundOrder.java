package com.wms.wmsbackend.entity;

import java.time.LocalDateTime;

public class OutboundOrder {
    private Long id;
    private String orderNum;
    private String outType; // e.g., "Sale", "Transfer"
    private String customerName;
    private String status; // e.g., "Pending", "Audited", "Cancelled"
    private String remark;
    private LocalDateTime createTime;
    private String createUser;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getOrderNum() { return orderNum; }
    public void setOrderNum(String orderNum) { this.orderNum = orderNum; }
    public String getOutType() { return outType; }
    public void setOutType(String outType) { this.outType = outType; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
    public String getCreateUser() { return createUser; }
    public void setCreateUser(String createUser) { this.createUser = createUser; }
}
