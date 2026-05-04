package com.wms.wmsbackend.mapper;

import com.wms.wmsbackend.entity.InboundOrder;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface InboundMapper {

    @Select("SELECT * FROM inbound_order ORDER BY create_time DESC")
    List<InboundOrder> findAll();

    @Insert("INSERT INTO inbound_order (order_num, in_type, supplier_name, status, remark, create_time, create_user) " +
            "VALUES (#{orderNum}, #{inType}, #{supplierName}, #{status}, #{remark}, NOW(), #{createUser})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(InboundOrder order);

    @Update("UPDATE inbound_order SET status = #{status} WHERE id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") String status);
}
