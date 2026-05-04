package com.wms.wmsbackend.mapper;

import com.wms.wmsbackend.entity.User;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserMapper {

    @Select("SELECT * FROM wms_user WHERE username = #{username}")
    User findByUsername(String username);

    @Insert("INSERT INTO wms_user (username, password_hash, role, display_name, email, avatar_url) " +
            "VALUES (#{username}, #{passwordHash}, #{role}, #{displayName}, #{email}, #{avatarUrl})")
    int insert(User user);

    @Update("UPDATE wms_user SET display_name = #{displayName}, email = #{email}, " +
            "avatar_url = #{avatarUrl} WHERE username = #{username}")
    int updateProfile(User user);

    @Update("UPDATE wms_user SET password_hash = #{passwordHash} WHERE username = #{username}")
    int updatePassword(User user);
}
