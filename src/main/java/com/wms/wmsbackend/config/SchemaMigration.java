package com.wms.wmsbackend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Additive upgrades: never replay old scans or rewrite existing inventory. */
@Component
@DependsOnDatabaseInitialization
public class SchemaMigration {
    private final JdbcTemplate jdbc;
    public SchemaMigration(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @PostConstruct
    public void migrate() {
        addColumn("wms_user", "display_name", "varchar(100)");
        addColumn("wms_user", "email", "varchar(255)");
        addColumn("wms_user", "avatar_url", "longtext");
        addColumn("wms_scan_log", "status", "varchar(20) NOT NULL DEFAULT 'Archived'");
        addColumn("wms_scan_log", "request_id", "varchar(64)");
        addColumn("wms_scan_log", "product_name", "varchar(255)");
        addColumn("wms_scan_log", "product_image", "text");
    }
    private void addColumn(String table, String column, String definition) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE lower(table_name) = lower(?) AND lower(column_name) = lower(?)", Integer.class, table, column);
        if (count != null && count == 0) jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
    }
}