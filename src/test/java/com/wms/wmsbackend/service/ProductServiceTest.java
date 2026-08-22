package com.wms.wmsbackend.service;

import com.wms.wmsbackend.entity.Product;
import com.wms.wmsbackend.mapper.ProductMapper;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@RunWith(MockitoJUnitRunner.class)
public class ProductServiceTest {

    @Mock
    private ProductMapper productMapper;

    @InjectMocks
    private ProductService productService;

    @Test
    public void testGetAllProducts() {
        Product p1 = new Product();
        p1.setId(1L);
        p1.setName("Product A");

        Product p2 = new Product();
        p2.setId(2L);
        p2.setName("Product B");

        when(productMapper.findAll()).thenReturn(Arrays.asList(p1, p2));

        List<Product> products = productService.getAllProducts();

        assertEquals(2, products.size());
        verify(productMapper, times(1)).findAll();
    }

    @Test
    public void testGetProductByBarcode() {
        Product p = new Product();
        p.setBarcode("12345");

        when(productMapper.findByBarcode("12345")).thenReturn(p);

        Product result = productService.getProductByBarcode("12345");
        assertEquals("12345", result.getBarcode());
        verify(productMapper, times(1)).findByBarcode("12345");
    }

    @Test
    public void testAddProduct() {
        Product p = new Product();
        p.setName("New Product");

        when(productMapper.insert(any(Product.class))).thenReturn(1);

        boolean isAdded = productService.addProduct(p);
        assertTrue(isAdded);
        verify(productMapper, times(1)).insert(p);
    }

    @Test
    public void testBatchInbound() {
        List<String> barcodes = Arrays.asList("111", "222", "111");
        
        productService.batchInbound(barcodes);
        
        verify(productMapper, times(2)).updateStock("111", 1);
        verify(productMapper, times(1)).updateStock("222", 1);
    }

    @Test
    public void testUpdateProduct() {
        Product p = new Product();
        p.setId(1L);

        when(productMapper.update(any(Product.class))).thenReturn(1);

        boolean isUpdated = productService.updateProduct(p);
        assertTrue(isUpdated);
        verify(productMapper, times(1)).update(p);
    }

    @Test
    public void testDeleteProduct() {
        when(productMapper.deleteById(1L)).thenReturn(1);

        boolean isDeleted = productService.deleteProduct(1L);
        assertTrue(isDeleted);
        verify(productMapper, times(1)).deleteById(1L);
    }
}
