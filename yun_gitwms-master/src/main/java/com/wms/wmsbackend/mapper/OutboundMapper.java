package com.wms.wmsbackend.mapper;

import com.wms.wmsbackend.entity.OutboundOrder;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface OutboundMapper {

    @Select("SELECT * FROM outbound_order ORDER BY create_time DESC")
    List<OutboundOrder> findAll();

    @Insert("INSERT INTO outbound_order (order_num, out_type, customer_name, status, remark, create_time, create_user) " +
            "VALUES (#{orderNum}, #{outType}, #{customerName}, #{status}, #{remark}, NOW(), #{createUser})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(OutboundOrder order);

    @Update("UPDATE outbound_order SET status = #{status} WHERE id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") String status);

    @Delete("DELETE FROM outbound_order WHERE id = #{id}")
    int deleteById(Long id);
}
