package com.wms.wmsbackend.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {
    /**
     * 防抖/幂等超时时间，默认 3000 毫秒 (3秒)
     */
    long timeout() default 3000;

    /**
     * 重复提交时的提示信息
     */
    String message() default "请勿重复提交 (重複送信しないでください)";
}