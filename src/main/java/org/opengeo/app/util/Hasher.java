package org.opengeo.app.util;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Utility class for generating hashes, based off of http://hashids.org/.
 */
public class Hasher {

    AtomicLong counter = new AtomicLong();
    Hashids hashids;

    public Hasher(int length) {
        hashids = new Hashids(UUID.randomUUID().toString(), length);
    }

    public String get() {
        return hashids.encode(counter.getAndIncrement());
    }
}
