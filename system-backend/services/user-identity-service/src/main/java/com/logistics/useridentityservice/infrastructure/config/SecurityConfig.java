package com.logistics.useridentityservice.infrastructure.config;

import com.logistics.common.security.PasetoAuthenticationFilter;
import com.logistics.common.security.PasetoTokenParser;
import com.logistics.useridentityservice.infrastructure.security.PasetoTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Beans reference classes from {@code logistics-security-common}. With Spring Boot DevTools, that JAR must be
 * listed in {@code META-INF/spring-devtools.properties} ({@code restart.include.*}) so it loads on the same
 * classpath as this configuration (see Spring Boot docs: Developer Tools, customizing the classpath).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${CORS_ALLOWED_ORIGIN}")
    private String corsAllowedOrigins;

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public PasetoTokenParser pasetoTokenParser(@Value("${paseto.secret-key}") String secretKey) {
        return new PasetoTokenParser(secretKey);
    }

    @Bean
    public PasetoAuthenticationFilter pasetoAuthenticationFilter(
        PasetoTokenParser pasetoTokenParser,
        PasetoTokenService pasetoTokenService
    ) {
        return new PasetoAuthenticationFilter(pasetoTokenParser, pasetoTokenService::isRevoked);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, PasetoAuthenticationFilter pasetoAuthenticationFilter) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(pasetoAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/v1/identity/auth/login",
                    "/api/v1/identity/auth/register",
                    "/api/v1/identity/auth/reset-password",
                    "/actuator/health",
                    "/actuator/info",
                    "/actuator/prometheus"
                ).permitAll()
                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        for (String origin : corsAllowedOrigins.split(",")) {
            config.addAllowedOrigin(origin.trim());
        }
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
