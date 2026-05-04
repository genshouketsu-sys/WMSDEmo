package com.wms.wmsbackend.service;

import com.wms.wmsbackend.entity.Product;
import com.wms.wmsbackend.mapper.ProductMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductService {

    @Autowired
    private ProductMapper productMapper;

    public List<Product> getAllProducts() {
        return productMapper.findAll();
    }

    public Product getProductByBarcode(String barcode) {
        return productMapper.findByBarcode(barcode);
    }

    public boolean addProduct(Product product) {
        return productMapper.insert(product) > 0;
    }

    @Transactional // 开启事务，保证批量入库要么全成功，要么全失败
    public void batchInbound(List<String> barcodes) {
        if (barcodes != null && !barcodes.isEmpty()) {
            for (String barcode : barcodes) {
                // 调用 Mapper 已有的 updateStock 方法，每次扫码增加 1 个库存
                productMapper.updateStock(barcode, 1);
            }
        }
    }

    public boolean updateProduct(Product product) {
        return productMapper.update(product) > 0;
    }

    public boolean deleteProduct(Long id) {
        return productMapper.deleteById(id) > 0;
    }
}