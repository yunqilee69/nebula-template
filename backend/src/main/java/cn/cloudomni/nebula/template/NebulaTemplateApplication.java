package cn.cloudomni.nebula.template;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 模板工程启动类。
 *
 * <p>框架自身模块通过各自的 {@code @MapperScan} 注册 Mapper，MyBatis 的自动 Mapper 扫描因此不再生效，
 * 业务 Mapper 需在此显式声明扫描路径：业务代码放在 {@code cn.cloudomni.nebula.template.<模块>.mapper}
 * 下即可自动注册，例如 {@code cn.cloudomni.nebula.template.wms.supplier.mapper.SupplierMapper}。</p>
 */
@SpringBootApplication
@MapperScan("cn.cloudomni.nebula.template.**.mapper")
public class NebulaTemplateApplication {

    public static void main(String[] args) {
        SpringApplication.run(NebulaTemplateApplication.class, args);
    }
}
