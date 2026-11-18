package cn.cloudomni.nebula.template;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

/**
 * 模板工程启动类。
 *
 * <p>框架自身模块通过各自的 {@code @MapperScan} 注册 Mapper，MyBatis 的自动 Mapper 扫描因此不再生效，
 * 业务 Mapper 需在此显式声明扫描路径：业务代码放在 {@code cn.cloudomni.nebula.template.<模块>.mapper}
 * 下即可自动注册，例如 {@code cn.cloudomni.nebula.template.wms.supplier.mapper.SupplierMapper}。</p>
 *
 * <p>框架有自己的账号体系（auth_account / auth_user），Spring Security 只承担接口鉴权；
 * 这里在代码层排除 Boot 默认的 {@link UserDetailsServiceAutoConfiguration}，避免它生成
 * 带随机密码的内存用户（启动日志里的 "Using generated security password" 噪音即来自此处）。
 * 该自动配置在框架工程中永远不会被使用，排除是稳定语义，不用 YAML 表达。</p>
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@MapperScan("cn.cloudomni.nebula.template.**.mapper")
public class NebulaTemplateApplication {

    public static void main(String[] args) {
        SpringApplication.run(NebulaTemplateApplication.class, args);
    }
}
