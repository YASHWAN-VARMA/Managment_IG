const permissions = {
    Admin: [
        "manage_users",
        "manage_vehicles",
        "manage_drivers",
        "manage_trips",
        "manage_finances",
        "manage_documents",
        "view_reports",
        "manage_settings"
    ],
    Manager: [
        "manage_vehicles",
        "manage_drivers",
        "manage_trips",
        "manage_finances",
        "manage_documents",
        "view_reports"
    ]
};
const authorize = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }
        const userPermissions = permissions[req.user.role] || [];
        if (!userPermissions.includes(permission)) {
            return res.status(403).json({
                message: "You don't have permission"
            });
        }
        next();
    };
};
module.exports = authorize;