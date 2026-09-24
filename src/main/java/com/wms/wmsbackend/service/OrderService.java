package com.wms.wmsbackend.service;
import com.wms.wmsbackend.entity.*;
import com.wms.wmsbackend.mapper.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class OrderService {
    private final JdbcTemplate jdbc;
    private final InboundMapper inbound;
    private final OutboundMapper outbound;
    public OrderService(JdbcTemplate jdbc, InboundMapper inbound, OutboundMapper outbound) { this.jdbc=jdbc;this.inbound=inbound;this.outbound=outbound; }
    private String table(boolean in) { return in ? "inbound_order" : "outbound_order"; }
    private String direction(boolean in) { return in ? "IN" : "OUT"; }
    private void lock() { jdbc.queryForObject("SELECT id FROM wms_system_lock WHERE id=1 FOR UPDATE",Integer.class); }
    @Transactional
    public int createInbound(InboundOrder order, String user) {
        lock();validateNumber(true,order.getOrderNum());validateItems(order.getItems());
        order.setStatus("Pending");order.setCreateUser(user);
        inbound.insert(order);saveItems(true,order.getId(),order.getItems());return 1;
    }
    @Transactional
    public int createOutbound(OutboundOrder order, String user) {
        lock();validateNumber(false,order.getOrderNum());validateItems(order.getItems());
        order.setStatus("Pending");order.setCreateUser(user);
        outbound.insert(order);saveItems(false,order.getId(),order.getItems());return 1;
    }
    private void validateNumber(boolean in, String number) {
        if (number==null || number.isBlank() || number.length()>50) throw new IllegalArgumentException("请输入有效单号。");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM "+table(in)+" WHERE order_num=?",Integer.class,number)>0)
            throw new IllegalArgumentException("单号已存在。");
    }
    private void validateItems(List<OrderItem> items) {
        // Existing clients may still save header-only drafts; audit requires details.
        if (items==null) return;
        for (OrderItem item:items) {
            if (item==null || item.getProductId()==null || item.getQuantity()==null || item.getQuantity()<=0)
                throw new IllegalArgumentException("请选择商品并输入大于零的整数数量。");
            if (jdbc.queryForObject("SELECT COUNT(*) FROM product WHERE id=?",Integer.class,item.getProductId())!=1)
                throw new IllegalArgumentException("商品不存在。");
        }
    }
    private void saveItems(boolean in, Long id, List<OrderItem> items) {
        if (items==null) return;
        for (OrderItem item:items) jdbc.update("INSERT INTO order_item(direction,order_id,product_id,quantity) VALUES(?,?,?,?)",direction(in),id,item.getProductId(),item.getQuantity());
    }
    public List<OrderItem> items(boolean in, Long id) {
        return jdbc.query("SELECT product_id,quantity FROM order_item WHERE direction=? AND order_id=? ORDER BY id",
            (rs,n)->{OrderItem item=new OrderItem();item.setProductId(rs.getLong(1));item.setQuantity(rs.getInt(2));return item;},direction(in),id);
    }
    @Transactional
    public int audit(boolean in, Long id) {
        lock();
        var rows=jdbc.queryForList("SELECT status FROM "+table(in)+" WHERE id=? FOR UPDATE",id);
        if (rows.isEmpty()) throw new IllegalArgumentException("单据不存在。");
        if ("Audited".equals(rows.get(0).get("status"))) return 1;
        if (!"Pending".equals(rows.get(0).get("status"))) throw new IllegalArgumentException("当前状态不能审核。");
        List<OrderItem> items=items(in,id);
        if (items.isEmpty()) throw new IllegalArgumentException("请先补充商品和数量，再审核历史单据。");
        validateItems(items);
        for (OrderItem item:items) {
            int delta=in ? item.getQuantity() : -item.getQuantity();
            int updated=jdbc.update("UPDATE product SET stock=stock+? WHERE id=? AND stock+? >= 0 AND stock+? <= 2147483647",delta,item.getProductId(),delta,delta);
            if (updated!=1) throw new IllegalArgumentException("库存不足或数量超出范围，整张单据未审核。");
            jdbc.update("INSERT INTO stock_movement(product_id,quantity,reference) VALUES(?,?,?)",item.getProductId(),delta,direction(in)+":"+id);
        }
        jdbc.update("UPDATE "+table(in)+" SET status='Audited' WHERE id=?",id);return 1;
    }
    @Transactional
    public int updateItems(boolean in, Long id, List<OrderItem> items) {
        lock();
        var rows=jdbc.queryForList("SELECT status FROM "+table(in)+" WHERE id=?",id);
        if (rows.isEmpty() || !"Pending".equals(rows.get(0).get("status"))) throw new IllegalArgumentException("仅待审核单据可修改明细。");
        validateItems(items);
        jdbc.update("DELETE FROM order_item WHERE direction=? AND order_id=?",direction(in),id);
        saveItems(in,id,items);return 1;
    }
    @Transactional
    public int deleteOutbound(Long id) {
        lock();
        var rows=jdbc.queryForList("SELECT status FROM outbound_order WHERE id=?",id);
        if (rows.isEmpty()) return 0;
        if ("Audited".equals(rows.get(0).get("status"))) throw new IllegalArgumentException("已审核单据不能删除，请通过退货单调整库存。");
        jdbc.update("DELETE FROM order_item WHERE direction='OUT' AND order_id=?",id);
        return outbound.deleteById(id);
    }
}