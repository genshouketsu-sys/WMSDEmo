package com.wms.wmsbackend.mapper;

import com.wms.wmsbackend.entity.FinanceBill;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface FinanceMapper {

    @Select("SELECT * FROM finance_bill ORDER BY create_time DESC")
    List<FinanceBill> findAll();

    @Insert("INSERT INTO finance_bill (bill_num, bill_type, amount, related_order, status, remark, create_time) " +
            "VALUES (#{billNum}, #{billType}, #{amount}, #{relatedOrder}, #{status}, #{remark}, NOW())")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(FinanceBill bill);

    @Update("UPDATE finance_bill SET status = #{status} WHERE id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") String status);

    @Delete("DELETE FROM finance_bill WHERE id = #{id}")
    int deleteById(Long id);
}
