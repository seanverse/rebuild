/*
rebuild - Building your business-systems freely.
Copyright (C) 2018-2019 devezhao <zhaofang123@gmail.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

package com.rebuild.web.setup;

import cn.devezhao.commons.web.ServletUtils;
import com.alibaba.fastjson.JSONObject;
import com.rebuild.server.Application;
import com.rebuild.server.helper.setup.Installer;
import com.rebuild.utils.JSONUtils;
import com.rebuild.web.BasePageControll;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;

/**
 * @author devezhao
 * @since 2019/11/25
 */
@Controller
@RequestMapping("/setup/")
public class InstallControll extends BasePageControll {

    @RequestMapping("install")
    public ModelAndView pageIndex(HttpServletResponse response) throws IOException {
        if (Application.serversReady()) {
            response.sendError(404);
            return null;
        }
        return createModelAndView("/setup/install.jsp");
    }

    @RequestMapping("test-connection")
    public void testConnection(HttpServletRequest request, HttpServletResponse response) throws IOException {
        JSONObject dbProps = (JSONObject) ServletUtils.getRequestJson(request);

        try (Connection conn = new Installer(JSONUtils.toJSONObject("databaseProps", dbProps)).getConnection(null)) {
            DatabaseMetaData dmd = conn.getMetaData();
            String msg = String.format("连接成功 : %s %s", dmd.getDatabaseProductName(), dmd.getDatabaseProductVersion());
            writeSuccess(response, msg);
        } catch (SQLException e) {
            if (e.getLocalizedMessage().contains("Unknown database")) {
                writeSuccess(response, "连接成功 : 数据库不存在，将自动创建");
            } else {
                writeFailure(response, "连接错误 : " + e.getLocalizedMessage());
            }
        }
    }

    @RequestMapping("install-rebuild")
    public void installExec(HttpServletRequest request, HttpServletResponse response) throws IOException {
        JSONObject installProps = (JSONObject) ServletUtils.getRequestJson(request);
        try {
            new Installer(installProps).install();
            writeSuccess(response);
        } catch (Exception e) {
            writeFailure(response, "出现错误 : " + e.getLocalizedMessage());
        }
    }
}
