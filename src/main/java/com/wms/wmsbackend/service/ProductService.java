package com.wms.wmsbackend.service;
import com.wms.wmsbackend.entity.Product;
import com.wms.wmsbackend.mapper.ProductMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ProductService {
    @Autowired private ProductMapper productMapper;
    public List<Product> getAllProducts() { return productMapper.findAll(); }
    public Product getProductByBarcode(String barcode) { return productMapper.findByBarcode(barcode); }
    @Transactional
    public boolean addProduct(Product product) {
        productMapper.lockInventory();
        validate(product);
        return productMapper.insert(product) > 0;
    }
    @Transactional
    public void batchInbound(List<String> barcodes) {
        if (barcodes == null || barcodes.isEmpty()) throw new IllegalArgumentException("请选择待入库记录。");
        productMapper.lockInventory();
        for (String barcode : barcodes) {
            if (barcode == null || barcode.isBlank() || productMapper.countBarcode(barcode, null) != 1)
                throw new IllegalArgumentException("条码不存在或对应多个商品：" + barcode);
        }
        for (String barcode : barcodes) {
            if (productMapper.updateStock(barcode, 1) != 1) throw new IllegalArgumentException("商品库存更新失败：" + barcode);
            productMapper.recordBarcodeMovement(barcode, 1, "scan");
        }
    }
    @Transactional
    public boolean updateProduct(Product product) {
        productMapper.lockInventory();
        validate(product);
        return productMapper.update(product) > 0;
    }
    @Transactional
    public boolean deleteProduct(Long id) {
        productMapper.lockInventory();
        return productMapper.deleteById(id) > 0;
    }
    private void validate(Product p) {
        if (p == null || p.getName() == null || p.getName().isBlank() || p.getSkuCode() == null || p.getSkuCode().isBlank())
            throw new IllegalArgumentException("商品名称和 SKU 不能为空。");
        if (p.getBarcode() != null && p.getBarcode().isBlank()) p.setBarcode(null);
        if (p.getBarcode() != null && productMapper.countBarcode(p.getBarcode(), p.getId()) > 0)
            throw new IllegalArgumentException("条码已被其他商品使用。");
        if (p.getStock() == null) p.setStock(0);
        if (p.getDailyUsage() == null) p.setDailyUsage(0.0);
        if (p.getLeadTimeDays() == null) p.setLeadTimeDays(7);
        if (p.getSafetyStock() == null) p.setSafetyStock(10);
        if (p.getStock() < 0 || !Double.isFinite(p.getDailyUsage()) || p.getDailyUsage() < 0 || p.getLeadTimeDays() < 0 || p.getSafetyStock() < 0)
            throw new IllegalArgumentException("库存、消耗和补货参数不能为负数。");
    }
}