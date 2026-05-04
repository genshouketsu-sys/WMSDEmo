package com.wms.wmsbackend.mapper;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import java.util.List;
import java.util.Map;

@Mapper
public interface ScanLogMapper {

    @Insert("INSERT INTO wms_scan_log(barcode, user_id, scan_time) VALUES(#{barcode}, #{userId}, NOW())")
    int insert(String barcode, String userId);

    @Select("SELECT COUNT(*) FROM wms_scan_log WHERE DATE(scan_time) = CURDATE()")
    int countScansToday();

    @Select("SELECT sl.*, p.name as productName " +
            "FROM wms_scan_log sl " +
            "LEFT JOIN product p ON sl.barcode = p.barcode " +
            "ORDER BY sl.scan_time DESC")
    List<Map<String, Object>> findAllLogs();
    @Select("SELECT id FROM wms_scan_log WHERE user_id = #{userId} ORDER BY scan_time DESC LIMIT 1")
    Long findLatestIdByUserId(String userId);

    @Delete("DELETE FROM wms_scan_log WHERE id = #{id}")
    int deleteById(Long id);

    @Select("SELECT barcode, COUNT(*) as scanCount " +
            "FROM wms_scan_log " +
            "WHERE scan_time >= DATE_SUB(NOW(), INTERVAL #{days} DAY) " +
            "GROUP BY barcode")
    List<Map<String, Object>> getRecentScanCounts(@org.apache.ibatis.annotations.Param("days") int days);
}
