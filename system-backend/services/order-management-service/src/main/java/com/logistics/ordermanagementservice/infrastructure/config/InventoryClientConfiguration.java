package com.logistics.ordermanagementservice.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class InventoryClientConfiguration {

    /** Bean name must differ from {@link com.logistics.ordermanagementservice.infrastructure.client.InventoryRestClient} component. */
    @Bean
    public RestClient inventoryHttpClient(
        @Value("${services.inventory.base-url:http://localhost:8082}") String baseUrl
    ) {
        return RestClient.builder().baseUrl(baseUrl).build();
    }
}
