-- ============================================================================
-- Nebula - Quartz Scheduler Database Initialization Script
-- File: 03-init-structure-quartz.sql
-- Purpose: Initialize Quartz scheduler tables for JDBC persistence (PostgreSQL)
-- Usage: psql -d <database> -f 03-init-structure-quartz.sql
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
    is_durable BOOLEAN NOT NULL,
    is_nonconcurrent BOOLEAN NOT NULL,
    is_update_data BOOLEAN NOT NULL,
    requests_recovery BOOLEAN NOT NULL,
    job_data BYTEA DEFAULT NULL,
    PRIMARY KEY (sched_name, job_name, job_group)
);

CREATE INDEX IF NOT EXISTS idx_qrtz_j_req_recovery ON qrtz_job_details (sched_name, requests_recovery);
CREATE INDEX IF NOT EXISTS idx_qrtz_j_grp ON qrtz_job_details (sched_name, job_group);


COMMENT ON TABLE qrtz_job_details IS 'Quartz任务定义表';
COMMENT ON COLUMN qrtz_job_details.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_job_details.job_name IS '任务名称';
COMMENT ON COLUMN qrtz_job_details.job_group IS '任务组';
COMMENT ON COLUMN qrtz_job_details.description IS '描述';
COMMENT ON COLUMN qrtz_job_details.job_class_name IS '任务类全限定名';
COMMENT ON COLUMN qrtz_job_details.is_durable IS '是否持久化';
COMMENT ON COLUMN qrtz_job_details.is_nonconcurrent IS '是否禁止并发';
COMMENT ON COLUMN qrtz_job_details.is_update_data IS '是否更新数据';
COMMENT ON COLUMN qrtz_job_details.requests_recovery IS '是否请求故障恢复';
COMMENT ON COLUMN qrtz_job_details.job_data IS '任务数据';
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
CREATE INDEX IF NOT EXISTS idx_qrtz_t_jg ON qrtz_triggers (sched_name, job_group);
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


COMMENT ON TABLE qrtz_triggers IS 'Quartz触发器表';
COMMENT ON COLUMN qrtz_triggers.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_triggers.trigger_name IS '触发器名称';
COMMENT ON COLUMN qrtz_triggers.trigger_group IS '触发器组';
COMMENT ON COLUMN qrtz_triggers.job_name IS '任务名称';
COMMENT ON COLUMN qrtz_triggers.job_group IS '任务组';
COMMENT ON COLUMN qrtz_triggers.description IS '描述';
COMMENT ON COLUMN qrtz_triggers.next_fire_time IS '下次触发时间';
COMMENT ON COLUMN qrtz_triggers.prev_fire_time IS '上次触发时间';
COMMENT ON COLUMN qrtz_triggers.priority IS '优先级';
COMMENT ON COLUMN qrtz_triggers.trigger_state IS '触发器状态';
COMMENT ON COLUMN qrtz_triggers.trigger_type IS '触发器类型';
COMMENT ON COLUMN qrtz_triggers.start_time IS '开始时间';
COMMENT ON COLUMN qrtz_triggers.end_time IS '结束时间';
COMMENT ON COLUMN qrtz_triggers.calendar_name IS '日历名称';
COMMENT ON COLUMN qrtz_triggers.misfire_instr IS '错过触发策略';
COMMENT ON COLUMN qrtz_triggers.job_data IS '任务数据';
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


COMMENT ON TABLE qrtz_simple_triggers IS 'Quartz简单触发器表';
COMMENT ON COLUMN qrtz_simple_triggers.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_simple_triggers.trigger_name IS '触发器名称';
COMMENT ON COLUMN qrtz_simple_triggers.trigger_group IS '触发器组';
COMMENT ON COLUMN qrtz_simple_triggers.repeat_count IS '重复次数';
COMMENT ON COLUMN qrtz_simple_triggers.repeat_interval IS '重复间隔';
COMMENT ON COLUMN qrtz_simple_triggers.times_triggered IS '已触发次数';
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


COMMENT ON TABLE qrtz_cron_triggers IS 'Quartz Cron触发器表';
COMMENT ON COLUMN qrtz_cron_triggers.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_cron_triggers.trigger_name IS '触发器名称';
COMMENT ON COLUMN qrtz_cron_triggers.trigger_group IS '触发器组';
COMMENT ON COLUMN qrtz_cron_triggers.cron_expression IS 'Cron表达式';
COMMENT ON COLUMN qrtz_cron_triggers.time_zone_id IS '时区ID';
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
    bool_prop_1 BOOLEAN DEFAULT NULL,
    bool_prop_2 BOOLEAN DEFAULT NULL,
    PRIMARY KEY (sched_name, trigger_name, trigger_group),
    CONSTRAINT fk_qrtz_simprop_triggers FOREIGN KEY (sched_name, trigger_name, trigger_group)
        REFERENCES qrtz_triggers (sched_name, trigger_name, trigger_group)
);


COMMENT ON TABLE qrtz_simprop_triggers IS 'Quartz简单属性触发器表';
COMMENT ON COLUMN qrtz_simprop_triggers.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_simprop_triggers.trigger_name IS '触发器名称';
COMMENT ON COLUMN qrtz_simprop_triggers.trigger_group IS '触发器组';
COMMENT ON COLUMN qrtz_simprop_triggers.str_prop_1 IS '字符串属性1';
COMMENT ON COLUMN qrtz_simprop_triggers.str_prop_2 IS '字符串属性2';
COMMENT ON COLUMN qrtz_simprop_triggers.str_prop_3 IS '字符串属性3';
COMMENT ON COLUMN qrtz_simprop_triggers.int_prop_1 IS '整数属性1';
COMMENT ON COLUMN qrtz_simprop_triggers.int_prop_2 IS '整数属性2';
COMMENT ON COLUMN qrtz_simprop_triggers.long_prop_1 IS '长整数属性1';
COMMENT ON COLUMN qrtz_simprop_triggers.long_prop_2 IS '长整数属性2';
COMMENT ON COLUMN qrtz_simprop_triggers.dec_prop_1 IS '小数属性1';
COMMENT ON COLUMN qrtz_simprop_triggers.dec_prop_2 IS '小数属性2';
COMMENT ON COLUMN qrtz_simprop_triggers.bool_prop_1 IS '布尔属性1';
COMMENT ON COLUMN qrtz_simprop_triggers.bool_prop_2 IS '布尔属性2';
CREATE TABLE IF NOT EXISTS qrtz_blob_triggers (
    sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(200) NOT NULL,
    trigger_group VARCHAR(200) NOT NULL,
    blob_data BYTEA DEFAULT NULL,
    PRIMARY KEY (sched_name, trigger_name, trigger_group),
    CONSTRAINT fk_qrtz_blob_triggers FOREIGN KEY (sched_name, trigger_name, trigger_group)
        REFERENCES qrtz_triggers (sched_name, trigger_name, trigger_group)
);


COMMENT ON TABLE qrtz_blob_triggers IS 'Quartz Blob触发器表';
COMMENT ON COLUMN qrtz_blob_triggers.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_blob_triggers.trigger_name IS '触发器名称';
COMMENT ON COLUMN qrtz_blob_triggers.trigger_group IS '触发器组';
COMMENT ON COLUMN qrtz_blob_triggers.blob_data IS '触发器数据';
CREATE TABLE IF NOT EXISTS qrtz_calendars (
    sched_name VARCHAR(120) NOT NULL,
    calendar_name VARCHAR(200) NOT NULL,
    calendar BYTEA NOT NULL,
    PRIMARY KEY (sched_name, calendar_name)
);


COMMENT ON TABLE qrtz_calendars IS 'Quartz日历表';
COMMENT ON COLUMN qrtz_calendars.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_calendars.calendar_name IS '日历名称';
COMMENT ON COLUMN qrtz_calendars.calendar IS '日历数据';
CREATE TABLE IF NOT EXISTS qrtz_paused_trigger_grps (
    sched_name VARCHAR(120) NOT NULL,
    trigger_group VARCHAR(200) NOT NULL,
    PRIMARY KEY (sched_name, trigger_group)
);


COMMENT ON TABLE qrtz_paused_trigger_grps IS 'Quartz暂停触发器组表';
COMMENT ON COLUMN qrtz_paused_trigger_grps.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_paused_trigger_grps.trigger_group IS '触发器组';
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
    is_nonconcurrent BOOLEAN DEFAULT NULL,
    requests_recovery BOOLEAN DEFAULT NULL,
    PRIMARY KEY (sched_name, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_qrtz_ft_trig_inst_name ON qrtz_fired_triggers (sched_name, instance_name);
CREATE INDEX IF NOT EXISTS idx_qrtz_ft_inst_job_req_rcvry ON qrtz_fired_triggers (sched_name, instance_name, requests_recovery);
CREATE INDEX IF NOT EXISTS idx_qrtz_ft_j_g ON qrtz_fired_triggers (sched_name, job_name, job_group);
CREATE INDEX IF NOT EXISTS idx_qrtz_ft_jg ON qrtz_fired_triggers (sched_name, job_group);
CREATE INDEX IF NOT EXISTS idx_qrtz_ft_t_g ON qrtz_fired_triggers (sched_name, trigger_name, trigger_group);
CREATE INDEX IF NOT EXISTS idx_qrtz_ft_tg ON qrtz_fired_triggers (sched_name, trigger_group);


COMMENT ON TABLE qrtz_fired_triggers IS 'Quartz已触发记录表';
COMMENT ON COLUMN qrtz_fired_triggers.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_fired_triggers.entry_id IS '执行条目ID';
COMMENT ON COLUMN qrtz_fired_triggers.trigger_name IS '触发器名称';
COMMENT ON COLUMN qrtz_fired_triggers.trigger_group IS '触发器组';
COMMENT ON COLUMN qrtz_fired_triggers.instance_name IS '调度实例名称';
COMMENT ON COLUMN qrtz_fired_triggers.fired_time IS '触发时间';
COMMENT ON COLUMN qrtz_fired_triggers.sched_time IS '调度时间';
COMMENT ON COLUMN qrtz_fired_triggers.priority IS '优先级';
COMMENT ON COLUMN qrtz_fired_triggers.state IS '状态';
COMMENT ON COLUMN qrtz_fired_triggers.job_name IS '任务名称';
COMMENT ON COLUMN qrtz_fired_triggers.job_group IS '任务组';
COMMENT ON COLUMN qrtz_fired_triggers.is_nonconcurrent IS '是否禁止并发';
COMMENT ON COLUMN qrtz_fired_triggers.requests_recovery IS '是否请求故障恢复';
CREATE TABLE IF NOT EXISTS qrtz_scheduler_state (
    sched_name VARCHAR(120) NOT NULL,
    instance_name VARCHAR(200) NOT NULL,
    last_checkin_time BIGINT NOT NULL,
    checkin_interval BIGINT NOT NULL,
    PRIMARY KEY (sched_name, instance_name)
);


COMMENT ON TABLE qrtz_scheduler_state IS 'Quartz调度器状态表';
COMMENT ON COLUMN qrtz_scheduler_state.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_scheduler_state.instance_name IS '调度实例名称';
COMMENT ON COLUMN qrtz_scheduler_state.last_checkin_time IS '最后检查时间';
COMMENT ON COLUMN qrtz_scheduler_state.checkin_interval IS '检查间隔';
CREATE TABLE IF NOT EXISTS qrtz_locks (
    sched_name VARCHAR(120) NOT NULL,
    lock_name VARCHAR(40) NOT NULL,
    PRIMARY KEY (sched_name, lock_name)
);

COMMENT ON TABLE qrtz_locks IS 'Quartz锁表';
COMMENT ON COLUMN qrtz_locks.sched_name IS '调度器名称';
COMMENT ON COLUMN qrtz_locks.lock_name IS '锁名称';
