package com.wms.wmsbackend.entity;

import java.time.LocalDateTime;

public class InboundOrder {
    private Long id;
    private String orderNum;
    private String inType; // e.g., "Purchase", "Return", "Adjustment"
    private String supplierName;
    private String status; // "Pending", "Audited"
    private String remark;
    private LocalDateTime createTime;
    private String createUser;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getOrderNum() { return orderNum; }
    public void setOrderNum(String orderNum) { this.orderNum = orderNum; }
    public String getInType() { return inType; }
    public void setInType(String inType) { this.inType = inType; }
    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
    public String getCreateUser() { return createUser; }
    public void setCreateUser(String createUser) { this.createUser = createUser; }
}
