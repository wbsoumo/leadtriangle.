class UserModel {
  final int id;
  final String name;
  final String email;
  final String mobile;
  final String roleName;
  final String roleDisplay;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.mobile,
    required this.roleName,
    required this.roleDisplay,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      mobile: json['mobile'] ?? '',
      roleName: json['role_name'] ?? 'operation_executive',
      roleDisplay: json['role_display'] ?? 'Operation Executive',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'mobile': mobile,
      'role_name': roleName,
      'role_display': roleDisplay,
    };
  }
}
