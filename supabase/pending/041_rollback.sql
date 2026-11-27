BEGIN;

DROP FUNCTION IF EXISTS buscontrol.admin_trip_detail(uuid, integer, integer);
DROP FUNCTION IF EXISTS buscontrol.admin_list_trip_buses();
DROP FUNCTION IF EXISTS buscontrol.admin_list_trips(date, date, uuid, text, text, text, integer, integer);

COMMIT;
