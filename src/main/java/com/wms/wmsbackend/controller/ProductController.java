package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.annotation.Idempotent;
import com.wms.wmsbackend.entity.Product;
import com.wms.wmsbackend.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*") // 允许前端跨域访问 (クロスドメインアクセスを許可 - 中文解释：允许前端跨域调用)
public class ProductController {

    @Autowired
    private ProductService productService;

    @GetMapping
    public ResponseEntity<List<Product>> getAll() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> add(@RequestBody Product product) {
        Map<String, Object> response = new HashMap<>();
        if (productService.addProduct(product)) {
            response.put("success", true);
            response.put("message", "商品添加成功 (商品追加成功)");
            return ResponseEntity.ok(response);
        }
        response.put("success", false);
        response.put("message", "商品添加失败 (商品追加失敗)");
        return ResponseEntity.status(500).body(response);
    }

    @PostMapping("/batch-inbound")
    @Idempotent(timeout = 3000) // 使用防抖注解 (デバウンスアノテーション)
    public ResponseEntity<Map<String, Object>> batchInbound(@RequestBody List<String> barcodes) {
        // 真实调用：遍历条码，更新数据库库存 (在庫更新)
        productService.batchInbound(barcodes);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "批量入库成功 (一括入庫成功)，共处理 " + barcodes.size() + " 条记录");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Product product) {
        product.setId(id);
        Map<String, Object> response = new HashMap<>();
        if (productService.updateProduct(product)) {
            response.put("success", true);
            response.put("message", "商品更新成功 (商品更新成功)");
            return ResponseEntity.ok(response);
        }
        response.put("success", false);
        response.put("message", "商品更新失败 (商品更新失敗)");
        return ResponseEntity.status(500).body(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        if (productService.deleteProduct(id)) {
            response.put("success", true);
            response.put("message", "商品删除成功 (商品削除成功)");
            return ResponseEntity.ok(response);
        }
        response.put("success", false);
        response.put("message", "商品删除失败 (商品削除失敗)");
        return ResponseEntity.status(500).body(response);
    }
}