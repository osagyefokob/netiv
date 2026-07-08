package com.logistics.procurementservice.infrastructure.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class ExternalServiceClientsConfig {

    @Bean
    @Qualifier("inventoryRestClient")
    public RestClient inventoryRestClient(
        @Value("${services.inventory.base-url:http://localhost:8082}") String baseUrl
    ) {
        return RestClient.builder().baseUrl(baseUrl).build();
    }

    @Bean
    @Qualifier("warehouseRestClient")
    public RestClient warehouseRestClient(
        @Value("${services.warehouse.base-url:http://localhost:8083}") String baseUrl
    ) {
        return RestClient.builder().baseUrl(baseUrl).build();
    }

    @Bean
    @Qualifier("ordersRestClient")
    public RestClient ordersRestClient(
        @Value("${services.orders.base-url:http://localhost:8084}") String baseUrl
    ) {
        return RestClient.builder().baseUrl(baseUrl).build();
    }

    @Bean
    @Qualifier("reportingRestClient")
    public RestClient reportingRestClient(
        @Value("${services.reporting.base-url:http://localhost:8087}") String baseUrl
    ) {
        return RestClient.builder().baseUrl(baseUrl).build();
    }
}
