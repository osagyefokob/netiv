package com.logistics.ordermanagementservice.infrastructure.lock;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OrderDistributedLock {

    private static final String KEY_PREFIX = "order:lock:";
    private static final Duration TTL = Duration.ofSeconds(30);

    private final StringRedisTemplate stringRedisTemplate;

    public boolean tryLock(UUID orderId) {
        Boolean ok = stringRedisTemplate.opsForValue()
            .setIfAbsent(KEY_PREFIX + orderId, "1", TTL);
        return Boolean.TRUE.equals(ok);
    }

    public void unlock(UUID orderId) {
        stringRedisTemplate.delete(KEY_PREFIX + orderId);
    }
}
