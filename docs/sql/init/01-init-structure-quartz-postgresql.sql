-- ============================================================================
-- Nebula - Quartz Scheduler Database Initialization Script
-- File: 01-init-structure-quartz-postgresql.sql
-- Purpose: Initialize Quartz scheduler tables for JDBC persistence (PostgreSQL)
-- Usage: psql -d <database> -f 01-init-structure-quartz-postgresql.sql
-- Notes:
--   1. Target database: PostgreSQL 14+.
--   2. 表建在**当前连接的库**中，不切换数据库：
--      - 单体应用（默认）：应用库即调度库，脚本随业务库初始化一起执行；
--      - 调度器独立部署：对调度服务自身的数据源执行本脚本。
--   3. 仅 Quartz + JDBC 持久化（org.quartz.jobStore.class=JobStoreTX）时需要执行；
--      默认的 RAMJobStore 无需建表（见 docs/sql/README.md）。
-- ============================================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS qrtz_job_details (
    sched_name VARCHAR(120) NOT NULL,
    job_name VARCHAR(200) NOT NULL,
    job_group VARCHAR(200) NOT NULL,
    description VARCHAR(250) DEFAULT NULL,
    job_class_name VARCHAR(250) NOT NULL,
    is_durable VARCHAR(1) NOT NULL,
    is_nonconcurrent VARCHAR(1) NOT NULL,
    is_update_data VARCHAR(1) NOT NULL,
    requests_recovery VARCHAR(1) NOT NULL,
    job_data BYTEA DEFAULT NULL,
    PRIMARY KEY (sched_name, job_name, job_group)
);

CREATE INDEX IF NOT EXISTS idx_qrtz_j_req_recovery ON qrtz_job_details (sched_name, requests_recovery);

CREATE TABLE IF NOT EXISTS qrtz_triggers (
    sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(200) NOT NULL,
    trigger_group VARCHAR(200) NOT NULL,
    job_name VARCHAR(200) NOT NULL,
    job_group VARCHAR(200) NOT NULL,
    description VARCHAR(250) DEFAULT NULL,
    next_fire_time BIGINT DEFAULT NULL,
    prev_fire_time BIGINT DEFAULT NULL,
    priority INTEGER DEFAULT NULL,
    trigger_state VARCHAR(16) NOT NULL,
    trigger_type VARCHAR(8) NOT NULL,
    start_time BIGINT NOT NULL,
    end_time BIGINT DEFAULT NULL,
    calendar_name VARCHAR(200) DEFAULT NULL,
    misfire_instr SMALLINT DEFAULT NULL,
    job_data BYTEA DEFAULT NULL,
    PRIMARY KEY (sched_name, trigger_name, trigger_group),
    CONSTRAINT fk_qrtz_triggers_job_details FOREIGN KEY (sched_name, job_name, job_group)
        REFERENCES qrtz_job_details (sched_name, job_name, job_group)
);

CREATE INDEX IF NOT EXISTS idx_qrtz_t_j ON qrtz_triggers (sched_name, job_name, job_group);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_jg ON qrtz_triggers (sched_name, trigger_group);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_c ON qrtz_triggers (sched_name, calendar_name);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_g ON qrtz_triggers (sched_name, trigger_group);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_state ON qrtz_triggers (sched_name, trigger_state);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_n_state ON qrtz_triggers (sched_name, trigger_name, trigger_group, trigger_state);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_n_g_state ON qrtz_triggers (sched_name, trigger_group, trigger_state);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_next_fire_time ON qrtz_triggers (sched_name, next_fire_time);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_nft_st ON qrtz_triggers (sched_name, trigger_state, next_fire_time);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_nft_misfire ON qrtz_triggers (sched_name, misfire_instr, next_fire_time);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_nft_st_misfire ON qrtz_triggers (sched_name, misfire_instr, next_fire_time, trigger_state);
CREATE INDEX IF NOT EXISTS idx_qrtz_t_nft_st_misfire_grp ON qrtz_triggers (sched_name, misfire_instr, next_fire_time, trigger_group, trigger_state);

CREATE TABLE IF NOT EXISTS qrtz_simple_triggers (
    sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(200) NOT NULL,
    trigger_group VARCHAR(200) NOT NULL,
    repeat_count BIGINT NOT NULL,
    repeat_interval BIGINT NOT NULL,
    times_triggered BIGINT NOT NULL,
    PRIMARY KEY (sched_name, trigger_name, trigger_group),
    CONSTRAINT fk_qrtz_simple_triggers FOREIGN KEY (sched_name, trigger_name, trigger_group)
        REFERENCES qrtz_triggers (sched_name, trigger_name, trigger_group)
);

CREATE TABLE IF NOT EXISTS qrtz_cron_triggers (
    sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(200) NOT NULL,
    trigger_group VARCHAR(200) NOT NULL,
    cron_expression VARCHAR(120) NOT NULL,
    time_zone_id VARCHAR(80) DEFAULT NULL,
    PRIMARY KEY (sched_name, trigger_name, trigger_group),
    CONSTRAINT fk_qrtz_cron_triggers FOREIGN KEY (sched_name, trigger_name, trigger_group)
        REFERENCES qrtz_triggers (sched_name, trigger_name, trigger_group)
);

CREATE TABLE IF NOT EXISTS qrtz_simprop_triggers (
    sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(200) NOT NULL,
    trigger_group VARCHAR(200) NOT NULL,
    str_prop_1 VARCHAR(512) DEFAULT NULL,
    str_prop_2 VARCHAR(512) DEFAULT NULL,
    str_prop_3 VARCHAR(512) DEFAULT NULL,
    int_prop_1 INTEGER DEFAULT NULL,
    int_prop_2 INTEGER DEFAULT NULL,
    long_prop_1 BIGINT DEFAULT NULL,
    long_prop_2 BIGINT DEFAULT NULL,
    dec_prop_1 NUMERIC(13,4) DEFAULT NULL,
    dec_prop_2 NUMERIC(13,4) DEFAULT NULL,
    bool_prop_1 VARCHAR(1) DEFAULT NULL,
    bool_prop_2 VARCHAR(1) DEFAULT NULL,
    PRIMARY KEY (sched_name, trigger_name, trigger_group),
    CONSTRAINT fk_qrtz_simprop_triggers FOREIGN KEY (sched_name, trigger_name, trigger_group)
        REFERENCES qrtz_triggers (sched_name, trigger_name, trigger_group)
);

CREATE TABLE IF NOT EXISTS qrtz_blob_triggers (
    sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(200) NOT NULL,
    trigger_group VARCHAR(200) NOT NULL,
    blob_data BYTEA DEFAULT NULL,
    PRIMARY KEY (sched_name, trigger_name, trigger_group),
    CONSTRAINT fk_qrtz_blob_triggers FOREIGN KEY (sched_name, trigger_name, trigger_group)
        REFERENCES qrtz_triggers (sched_name, trigger_name, trigger_group)
);

CREATE TABLE IF NOT EXISTS qrtz_calendars (
    sched_name VARCHAR(120) NOT NULL,
    calendar_name VARCHAR(200) NOT NULL,
    calendar BYTEA NOT NULL,
    PRIMARY KEY (sched_name, calendar_name)
);

CREATE TABLE IF NOT EXISTS qrtz_paused_trigger_grps (
    sched_name VARCHAR(120) NOT NULL,
    trigger_group VARCHAR(200) NOT NULL,
    PRIMARY KEY (sched_name, trigger_group)
);

CREATE TABLE IF NOT EXISTS qrtz_fired_triggers (
    sched_name VARCHAR(120) NOT NULL,
    entry_id VARCHAR(95) NOT NULL,
    trigger_name VARCHAR(200) NOT NULL,
    trigger_group VARCHAR(200) NOT NULL,
    instance_name VARCHAR(200) NOT NULL,
    fired_time BIGINT NOT NULL,
    sched_time BIGINT NOT NULL,
    priority INTEGER NOT NULL,
    state VARCHAR(16) NOT NULL,
    job_name VARCHAR(200) DEFAULT NULL,
    job_group VARCHAR(200) DEFAULT NULL,
    is_nonconcurrent VARCHAR(1) DEFAULT NULL,
    requests_recovery VARCHAR(1) DEFAULT NULL,
    PRIMARY KEY (sched_name, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_qrtz_ft_trig_inst_name ON qrtz_fired_triggers (sched_name, instance_name);
CREATE INDEX IF NOT EXISTS idx_qrtz_ft_inst_job_req_rcvry ON qrtz_fired_triggers (sched_name, instance_name, requests_recovery);
CREATE INDEX IF NOT EXISTS idx_qrtz_ft_j_g ON qrtz_fired_triggers (sched_name, job_name, job_group);
CREATE INDEX IF NOT EXISTS idx_qrtz_ft_jg ON qrtz_fired_triggers (sched_name, job_group);
CREATE INDEX IF NOT EXISTS idx_qrtz_ft_t_g ON qrtz_fired_triggers (sched_name, trigger_name, trigger_group);
CREATE INDEX IF NOT EXISTS idx_qrtz_ft_tg ON qrtz_fired_triggers (sched_name, trigger_group);

CREATE TABLE IF NOT EXISTS qrtz_scheduler_state (
    sched_name VARCHAR(120) NOT NULL,
    instance_name VARCHAR(200) NOT NULL,
    last_checkin_time BIGINT NOT NULL,
    checkin_interval BIGINT NOT NULL,
    PRIMARY KEY (sched_name, instance_name)
);

CREATE TABLE IF NOT EXISTS qrtz_locks (
    sched_name VARCHAR(120) NOT NULL,
    lock_name VARCHAR(40) NOT NULL,
    PRIMARY KEY (sched_name, lock_name)
);
