package com.wms.wmsbackend.aspect;

import com.wms.wmsbackend.annotation.Idempotent;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

@Aspect
@Component
public class IdempotentAspect {

    // 使用本地 Map 替代 Redis 解决本地无 Redis 服务的问题
    private static final java.util.concurrent.ConcurrentHashMap<String, Long> localCache = new java.util.concurrent.ConcurrentHashMap<>();

    @Around("@annotation(idempotent)")
    public Object checkIdempotent(ProceedingJoinPoint joinPoint, Idempotent idempotent) throws Throwable {
        String key = "idempotent:" + joinPoint.getSignature().toShortString();
        long now = System.currentTimeMillis();
        
        // 清理过期数据
        localCache.entrySet().removeIf(entry -> entry.getValue() < now);

        // 如果存在且未过期，说明是重复提交
        if (localCache.putIfAbsent(key, now + idempotent.timeout()) != null) {
            throw new RuntimeException(idempotent.message());
        }
        
        return joinPoint.proceed();
    }
}