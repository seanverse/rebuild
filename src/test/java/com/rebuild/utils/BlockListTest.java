/*
Copyright (c) REBUILD <https://getrebuild.com/> and/or its owners. All rights reserved.

rebuild is dual-licensed under commercial and open source licenses (GPLv3).
See LICENSE and COMMERCIAL in the project root for license information.
*/

package com.rebuild.utils;

import org.junit.Assert;
import org.junit.Test;

/**
 * @author devezhao zhaofang123@gmail.com
 * @since 2019/03/08
 */
public class BlockListTest {

    @Test
    public void test() {
        Assert.assertTrue(BlockList.isBlock("admin"));
        Assert.assertFalse(BlockList.isBlock("imnotadmin"));
    }
}
