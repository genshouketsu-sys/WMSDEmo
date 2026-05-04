package com.wms.wmsbackend.mapper;

import com.wms.wmsbackend.entity.Product;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface ProductMapper {
    
    // 查询所有商品 (全ての商品をクエリ - 中文解释：查询所有商品)
    @Select("SELECT * FROM product ORDER BY create_time DESC")
    List<Product> findAll();

    // 根据条码查询商品 (バーコードで商品を検索 - 中文解释：根据条码查询商品)
    @Select("SELECT * FROM product WHERE barcode = #{barcode}")
    Product findByBarcode(String barcode);

    // 新增商品 (商品の追加 - 中文解释：新增商品)
    @Insert("INSERT INTO product(sku_code, name, barcode, stock, daily_usage, lead_time_days, safety_stock, create_time) " +
            "VALUES(#{skuCode}, #{name}, #{barcode}, #{stock}, #{dailyUsage}, #{leadTimeDays}, #{safetyStock}, NOW())")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Product product);
    
    // 更新库存 (在庫の更新 - 中文解释：更新库存)
    @Update("UPDATE product SET stock = stock + #{amount} WHERE barcode = #{barcode}")
    int updateStock(@Param("barcode") String barcode, @Param("amount") int amount);

    // 更新商品 (商品の更新)
    @Update("UPDATE product SET sku_code = #{skuCode}, name = #{name}, barcode = #{barcode}, stock = #{stock}, " +
            "daily_usage = #{dailyUsage}, lead_time_days = #{leadTimeDays}, safety_stock = #{safetyStock} WHERE id = #{id}")
    int update(Product product);

    // 删除商品 (商品の削除)
    @Delete("DELETE FROM product WHERE id = #{id}")
    int deleteById(Long id);

    @Select("SELECT COUNT(*) FROM product")
    int countActiveSKUs();

    @Select("SELECT COUNT(*) FROM product WHERE stock < safety_stock")
    int countLowStockAlerts();
}