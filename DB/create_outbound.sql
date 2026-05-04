CREATE TABLE IF NOT EXISTS outbound_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_num VARCHAR(50) NOT NULL,
    out_type VARCHAR(20),
    customer_name VARCHAR(100),
    status VARCHAR(20),
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    create_user VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS finance_bill (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bill_num VARCHAR(50) NOT NULL,
    bill_type VARCHAR(20),
    amount DECIMAL(18, 2),
    related_order VARCHAR(50),
    status VARCHAR(20),
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inbound_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_num VARCHAR(50) NOT NULL,
    in_type VARCHAR(20),
    supplier_name VARCHAR(100),
    status VARCHAR(20),
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    create_user VARCHAR(50)
);
