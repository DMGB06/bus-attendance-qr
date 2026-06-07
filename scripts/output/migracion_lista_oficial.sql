-- ============================================================
-- BusControl: migración a lista oficial únicamente
-- GENERADO AUTOMÁTICAMENTE — revisar antes de ejecutar
-- Alumnos oficiales: 109
-- Apoderados únicos: 69
-- ============================================================

BEGIN;

-- 1) Tablas nuevas de apoderados
CREATE TABLE IF NOT EXISTS bus_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  phone_normalized text,
  dni text,
  email text,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bus_guardians_phone_norm_uidx
  ON bus_guardians (phone_normalized)
  WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';

CREATE TABLE IF NOT EXISTS bus_student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES social_bus_escolar(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES bus_guardians(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'apoderado',
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, guardian_id)
);

ALTER TABLE social_bus_escolar
  ADD COLUMN IF NOT EXISTS enrollment_status text NOT NULL DEFAULT 'active';

-- 2) Limpiar datos viejos (ya tienes backup)
DELETE FROM bus_attendance_records;
DELETE FROM bus_student_guardians;
DELETE FROM bus_guardians;
DELETE FROM social_bus_escolar;

-- 3) Apoderados oficiales
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('d5e678d8-4040-40a5-a8aa-3af97be45230', 'Adreilis Piña', '907 012 006', '907012006', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('f3de7239-42fa-4a76-806e-929dfafd4028', 'Ana Allazo', '983 255 015', '983255015', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('80dca274-884f-42dd-a926-ec0e6f43643c', 'Ana Quispe Lopez', '943 928 846', '943928846', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('bc607ad3-d62a-4571-a7ca-95877a80f1a3', 'Ana Salas', '988 634 247', '988634247', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('c7295d0d-be2f-496a-83b9-aa9c6d954348', 'Angela Cabrera Reynoso', '982 506 075', '982506075', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('dfdabab4-be06-4f31-bb88-4e7763557cde', 'Aracely Felix', '974 092 881', '974092881', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('fdb8ff30-1a33-48de-8afc-364935efcd96', 'Carmen Chavez', NULL, NULL, true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('851ce364-7522-429c-b391-d810f7615f54', 'Carmen Gutiérrez', '947 874 597', '947874597', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('0c69c557-fce7-4453-b269-44974289ae79', 'Carmen Quiroz Arias', '967 475 825', '967475825', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('c1d038f7-2d9a-4b9e-8b77-b2cd69b291f7', 'Carolina Villar Alva', '902 275 504', '902275504', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('41b63a5c-7276-4c8f-8127-88ba1f5d4d7d', 'Clarita Atoccsa Escalante', '955 186 673', '955186673', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('c6fe5499-2951-449e-89d8-d297879b3566', 'Claudia Manco Benavente', '973 444 517', '973444517', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('ee6b76ef-44c9-4d19-887e-829797ad0efb', 'Deisy Del Carpio Igna', '959 631 013', '959631013', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('7c49b4f8-2267-4ca4-9fc1-ae361af38318', 'Diana Castro Julián', '944 635 937', '944635937', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('baa2e952-d3bf-4697-9694-fa25407ab99a', 'Eliana Espinoza', '954 085 107', '954085107', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('636d3fcb-500d-4dbf-b10e-590b76606795', 'Elizabeth Manrique Quispe', '979 740 113', '979740113', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('0c9a33e5-e626-4fb8-bf3d-9207c108dc96', 'Elsa Venancio Gonzales', '960 243 435', '960243435', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('5ae6b815-5bbf-45ce-bcd4-995aa6c720f2', 'Elvira Ormeño', '967 749 140', '967749140', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('34753a4a-0f02-4984-be7d-143b248b12ed', 'Emecilia Cueva Reategui', '994 334 659', '994334659', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('273da5ae-ccf5-498b-a54a-9fe8abf5a992', 'Emily Ramos Campos', '982 738 087', '982738087', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('5247701b-adb1-4969-9f31-435dd4ee3e12', 'Emma Quispe Hidalgo', '975 661 136', '975661136', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('82117717-f70b-4cf7-9b3a-54f990f6345d', 'Emperatriz Samaniego', '978 895 786', '978895786', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('e9e55f2b-fd71-436d-858f-728102dc2a40', 'Esmirna Pérez Sandoval', '918 721 963', '918721963', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('a5e7b4c2-af3c-4351-9827-d78eb7933c9e', 'Estrella Huamán Carbonel', '962 101 659', '962101659', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('fe39452f-ce8c-4804-a74b-41473f5d7a5e', 'Gladis Chipa Aymara', '966 786 815', '966786815', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('00c620cc-d233-4388-b8af-934380ff9f59', 'Glutilde Ñaupa Domínguez', '996 419 633', '996419633', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('0f3f1f9b-f610-4119-a482-744f65414265', 'Heidi Bustos Velazco', '937 685 659', '937685659', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('1d7c0a1f-0691-45fd-84f3-bdca33fab5a1', 'Jennifer Padilla Morello', '999 631 429', '999631429', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('b60b25d6-4317-413e-bd0f-86d2f342eab0', 'Jhonny Machacuay', '958 070 961', '958070961', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('7a6ff555-a19c-47df-84db-d45c1b40938c', 'Joselín Uchuypoma Hilario', '931 715 101', '931715101', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('667a5c29-c306-4823-ad2b-1ce720c13544', 'Julia Salas Torres', '926 715 020', '926715020', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('9335551b-ea7a-4e65-be77-2d41dd237f88', 'Julissa Atoccsa Escalante', '997 636 732', '997636732', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('a4df8cc0-0cbc-4c2f-b1d5-e124b4a188dd', 'Katerin Segura', NULL, NULL, true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('97d4bec8-2a05-4c95-86be-d494ff230a2e', 'Katty Jiménez Suárez', '924 011 184', '924011184', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('21a071f6-9b67-46c2-b6da-7160991624ef', 'Katty Pariona', '994 997 871', '994997871', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('cdd4fabc-424f-4604-8716-df7ff16ef7da', 'Kelly Yanac Segovia', '990 524 934', '990524934', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('84ceea70-f27b-4b31-b118-3f40afb2b2bb', 'Laura Aylas', '995 164 846', '995164846', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('2c484048-81ce-4797-b8f6-7d1361b0cfef', 'Liz Chamorro Valdés', '924 027 344', '924027344', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('029541d3-bc54-455f-84dc-d2175be96880', 'Luz Chamorro Valdés', '939 868 987', '939868987', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('cb6b9381-18c9-4612-9da5-91d2688d7520', 'Magaly Gutiérrez Tito', '957 728 504', '957728504', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('c6a99329-9fc0-49dc-b41a-6e810d5fc6ee', 'Mailyn Parra', '953 725 285', '953725285', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('f04b95cc-3ee8-48bc-8903-02180fcef03a', 'Margarita Campos Julian', NULL, NULL, true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('8cbbbfdc-4d05-4cc0-8c06-aa0b40c92b81', 'Marianela Caro', '967 665 621', '967665621', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('6e59dbcf-64ae-4d12-b55e-83028c224e6b', 'Marisela Ccasani Sarabia', '957 224 831', '957224831', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('d957b704-fb83-4bfc-99c9-e3f613a090a6', 'María Llamo Molina', '967 754 522', '967754522', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('ab88d9bc-744d-41ad-a950-3336c5f7719f', 'María Montenegro Goicochea', '992 975 643', '992975643', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('4ecb97f7-4da7-46f6-bccc-66bc1890e807', 'María Pezo Fernando', '976 781 233', '976781233', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('d9e05315-7a4f-4cd3-977d-71e747498930', 'Nancy Mena', '973 894 776', '973894776', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('246c244e-4b1c-467d-ad8a-a2faa5a41b99', 'Nely Coronado', '959 427 816', '959427816', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('cf2669a4-b207-4789-89a4-dc5d2e8464d9', 'Nerio Carrasco León', '987 182 446', '987182446', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('0da084bc-98ac-4f81-9df5-a34df4d5832e', 'Norma', '925 620 602', '925620602', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('bdd72fe4-dba9-4ace-abfc-474dc96e2fd1', 'Norma Cuba Gamboa', '953 508 117', '953508117', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('31dcce7d-5086-4687-bfe2-04062c189c38', 'Patricia', '976 314 276', '976314276', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('00ed4a51-73aa-4470-81d9-23fec5b7432d', 'Reyna Chávez Quispe', '975 335 612', '975335612', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('e266e68e-b729-41a2-bfc7-adbadc5a1f07', 'Reyna Vargas Palomino', '939 168 439', '939168439', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('88b2a6f2-549b-4d12-a41f-7040942a490f', 'Rosa Dieztra', '943 966 421', '943966421', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('de83106a-bbb5-4231-9d59-995ae4ede771', 'Rosa Samaniego', '973 407 516', '973407516', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('34ac5acc-60cc-4afd-b98c-d8273ada6e84', 'Rosario Mesares Alarcón', '938 946 289', '938946289', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('dfd9a132-1c7e-4f0d-a055-c6f94f4b695c', 'Rosmery Berrocal Rojas', '950 775 788', '950775788', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('7e2bf5b4-bbb2-49a1-b4e5-b997af5a86e9', 'Sabi Ccoyllo Arias', '913 504 589', '913504589', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('9fe40d48-ac09-4c21-a8e6-96536a77e792', 'Samanta Arascue Pariona', '978 702 904', '978702904', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('c1acb29f-8639-460e-8967-e2b82cdd1ac0', 'Sara La Madrid Garcia', '979 669 541', '979669541', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('08bb5595-991b-43bb-a48e-8852607c0dc0', 'Sheyla Peves', '955 966 586', '955966586', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('db15fceb-05da-4eca-b28a-6be1fd0c4551', 'Silvia Hinostroza Vargas', '943 026 044', '943026044', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('0e247d76-958f-4406-a18f-2f274a1c2532', 'Sofía Allazo Caja', '919 194 560', '919194560', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('6c383cce-cabd-438f-adb3-bb96d647b1a4', 'Sumiko Ravello Hirakawa', '964 650 232', '964650232', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('5594ceda-0574-46f5-b6e7-93d50dcaa929', 'Valquiria Villalobos Felix', '937 033 465', '937033465', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('118cdff9-4b80-4bc4-9a07-2be226c843eb', 'Yohana Peves Martínez', '936 565 082', '936565082', true);
INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES ('80f5f70c-bb12-447b-912d-cd7042aae744', 'Zenia Flores Inga', '918 121 128', '918121128', true);

-- 4) Alumnos oficiales
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('96bc9edb-24d0-4b8e-9a9e-4db44b3f244a', 'Brigitte Tocto Cueva', '75936444', NULL, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'SEÑOR DE LOS MILAGROS', 'BU0015', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('0cac0358-5120-4a7b-925b-4fee1bb67fd7', 'Yohan Tocto Cueva', '91034706', 7, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'SEÑOR DE LOS MILAGROS', 'BU0014', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('b7e3cf35-47fb-4a6a-9ed0-76bd91c51a1b', 'Sumiko Saldaña Ravello', '90952440', 7, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'PUENTE TABLA', 'BU0031', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('902ec17e-40da-41d9-94b9-efd90464e89f', 'Yumiko Saldaña Ravello', '90952470', 7, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'PUENTE TABLA', 'BU0032', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('1ad2fa24-e6de-4962-b964-34df0adcc281', 'Katsumi Saldaña Ravello', '78594650', 12, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'PUENTE TABLA', 'BU0033', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('22cc58b6-675f-4f88-832d-b9bc31b6e7de', 'Heykel Espíritu Ormeño', '62575948', 15, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'CASA BLANCA', 'BU0106', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('e8ac27b9-6056-498c-9b3f-706301a5d6a0', 'Adriano Espíritu Ormeño', '78766323', 10, 'MASCULINO', 'JOSÉ OLAYA BALANDRA', 'CASA BLANCA', 'BU0105', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('55c9450c-3566-4e9b-b4b3-36f6b02a4739', 'Jherson Félix Arascue', '89919063', NULL, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'BELLAVISTA', 'BU0016', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('1ffb6d07-6d17-4d97-b571-f005154f5b6a', 'Kiara Félix Arascue', '90090547', 15, 'FEMENINO', 'GERARDO SALOMÓN MEJÍA SACO', 'BELLAVISTA', 'BU0017', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('95a2796b-51a6-40a8-a177-df0476e58905', 'Gerard Cueva Cabrera', 'PEND-010', NULL, NULL, NULL, NULL, 'BU0113', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('a00d4b2a-fe20-4b93-9938-776192ed6d8d', 'Dulce León Jiménez', '89919072', 15, 'FEMENINO', 'GERARDO SALOMÓN MEJÍA SACO', 'SEÑOR DE LOS MILAGROS', 'BU0018', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('492a4d2f-6619-42af-9bea-92f33077a481', 'Dayiro Machacuay Villar', '79605247', 10, 'MASCULINO', 'JOSÉ OLAYA BALANDRA', 'CPM. CASA BLANCA MZ LT 02', 'BU0001', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('05b4a432-d964-4947-9b18-99fd1d37dbf6', 'James Cuchula Flores', '22458974', 7, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'ESTABLO', 'BU0107', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('4a9702e7-1d71-4b61-9100-caef86cb3f5d', 'Simón Cuchula Flores', '62576170', 15, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'ESTABLO', 'BU0108', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('7fbaa7cc-28e8-4e80-971c-fb907c675fe8', 'Karina Vasquez Montenegro', '90499226', 8, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'SEÑOR DE LOS MILAGROS', 'BU0062', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('0179cb41-80c5-410c-abcb-3b80b9c70d76', 'Cristofer Martínez Ñaupa', '63080727', 12, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'SEÑOR DE LOS MILAGROS', 'BU0065', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('17732644-29c3-404b-97ec-c59e13fcfb2e', 'Jared Casimiro Mesares', '80919095', NULL, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'GERARDO SALOMÓN MEJÍA SACO', 'BU0022', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('d1d5bc28-960d-4d08-a2e3-605100049e33', 'Angela Ormeño Ramos', '90073542', NULL, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'CASA BLANCA', 'BU0023', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('f4733bed-e1f1-4909-b103-b54cf419cf58', 'Marita Puedes Chipa', '91454479', 6, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'CASA BLANCA', 'BU0054', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('748d420d-9d4b-44ec-8ad1-09c1979339e1', 'Dayana Cáceres Mena', 'PEND-020', NULL, NULL, NULL, NULL, 'BU0114', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('7f6ad914-c76c-4297-9b70-f38e72ad3736', 'Jhordy Cáceres Mena', 'PEND-021', NULL, NULL, NULL, NULL, 'BU0115', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('4e540544-373d-4bda-9903-9e7d297ec10e', 'Miller Vidal Bustos', '79719352', 10, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'COLINA BLANCA', 'BU0027', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('ac824d9a-6cc3-44e8-bb9e-310c7bcab683', 'Fernando Vidal Bustos', '78397711', 12, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'COLINA BLANCA', 'BU0028', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('4cb3eec8-f0f2-4e75-8c6c-834d1c796feb', 'Henry Vidal Bustos', '77520023', 10, 'MASCULINO', 'JOSÉ OLAYA BALANDRA', 'COLINA', 'BU0036', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('df18922f-ed18-45ad-ae51-fb70596cb633', 'Ariana Quispe Villalobos', '77556673', NULL, 'FEMENINO', 'GERARDO SALOMÓN MEJÍA SACO', 'PUENTE TABLA', 'BU0034', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('c6bcb160-e228-43e1-9e62-61bcbad9d893', 'Bryan Soriano Venancio', '80772065', NULL, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'ESTABLO', 'BU0075', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('5dd86047-25ae-4d65-a2d1-5d5b4d2e2a04', 'José Soriano Venancio', '79899652', 7, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'ESTABLO', 'BU0076', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('08bc9dd5-c622-41c1-96b1-91d86777e3ba', 'Rosangela Huamán Hinostroza', '57682145', 10, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'SEÑOR DE LOS MILAGROS', 'BU0077', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('b6fce94b-ee6b-4c1e-8db2-ef1d4e77b656', 'Kenny Huamán Hinostroza', '90227376', 8, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'SEÑOR DE LOS MILAGROS', 'BU0078', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('adc67441-5911-42d5-8270-e9f5ebea6a2d', 'Lucas Samaniego', '79597778', 12, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'MIRAFLORES', 'BU0109', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('b36abf4e-9c4c-4ea6-b242-78dab68fc335', 'Daniela Gutiérrez', '90235585', 8, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'MIRAFLORES', 'BU0110', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('784d2140-d961-465c-9a8d-2e1edf7c2dae', 'Frank Huamaní Espinoza', '79830954', 7, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'BELLAVISTA', 'BU0096', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('002b7a58-c199-4f21-911c-0985b416e7ce', 'Zoe Flores Atoccsa', 'PEND-033', 6, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'MILAGROS', 'BU0098', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('65173593-603f-41c4-993d-23813f084a8d', 'Mía Lores Atoccsa', '56478932', 13, 'FEMENINO', 'GERARDO SALOMÓN MEJÍA SACO', 'SEÑOR DE LOS MILAGROS', 'BU0099', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('8ebb68f8-c160-4368-b6b4-0e2d08544137', 'María Quispe Salas', 'PEND-035', 12, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'CASA BLANCA', 'BU0057', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('e5143a62-fe57-4eed-a86a-211c04058643', 'Dylan Quero Piña', '23476206', 8, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'CASA BLANCA', 'BU0080', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('e9acc5c6-1a7f-4a5a-9588-af4481a73375', 'Vania Estrada Chávez', '90307240', 8, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'SEÑOR DE LOS MILAGROS', 'BU0041', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('6bb856c0-e1b2-4ff7-8ee3-8c589c0a5f27', 'Fabrizio Silva Chavez', '78242203', 13, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'SEÑOR DE LOS MILAGROS', 'BU0042', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('375faee8-fecf-47be-a987-a6ecd745da23', 'Carito Quispe Quiroz', '91007226', 7, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'CASA BLANCA', 'BU0058', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('16de4da6-5f59-46a4-8f21-08f31ce0e475', 'Matías Quispe Quiroz', 'PEND-040', NULL, NULL, NULL, NULL, 'BU0116', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('bb7c73e1-51ee-4154-afd9-7feb503b0ac5', 'Alis Ramírez Berrocal', '79956249', 9, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'SEÑOR DE LOS MILAGROS', 'BU0081', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('04f57b9a-acdf-40b6-9fe1-31b391ab2963', 'Milán Grandez Huamán', '79696715', 10, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'TRANQUERA DE FIERRO', 'BU0038', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('43ef9964-c7dc-4e82-9435-09e3537b6a2a', 'Brithney Rojas Huamán', '90663470', 8, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'TRANQUERA DE FIERRO', 'BU0037', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('92dca59b-3c38-47fe-aac3-a4b1f59a3cb2', 'Steban Quiroz Peves', 'PEND-044', 7, 'MASCULINO', 'JOSÉ OLAYA BALANDRA', 'PUENTE TABLA', 'BU0068', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('77663d0b-257d-4d41-98ec-ae67f67f6503', 'Sebastian Quiroz Peves', 'PEND-045', NULL, NULL, NULL, NULL, 'BU0117', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('ade7a575-b2ad-4d75-a9b0-61ecb9ff6f8d', 'Lucas Quiroz Peves', '81403859', 12, 'FEMENINO', 'GERARDO SALOMÓN MEJÍA SACO', 'PUENTE TABLA', 'BU0024', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('061f4dba-652a-4c55-82af-7c38c63ec089', 'Claribel Carrasco Chero', '79295159', 10, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'CASA BLANCA', 'BU0100', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('13d63037-44de-44b1-b0fe-f0ff253ab6f8', 'Belén Allazo Caro', '62271601', 15, 'FEMENINO', 'GERARDO SALOMÓN MEJÍA SACO', 'PUENTE TABLA', 'BU0070', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('6c16faf8-e105-4f71-92be-2679692e954c', 'Jeremías Allazo Caro', '81447644', 10, 'MASCULINO', 'JOSÉ OLAYA BALANDRA', 'PUENTE TABLA', 'BU0072', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('ba641308-2b70-45e3-9f64-2b4ae575f88a', 'Lucas Allazo Caro', '91592255', 6, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'PUENTE TABLA', 'BU0071', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('b2e56bd6-1484-4ce0-9698-447d2f46a441', 'Olga Mercado Perez', 'PEND-051', NULL, NULL, NULL, NULL, 'BU0118', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('1e653316-4231-470e-bdf0-8f6dc7beee01', 'Azumi Alvites Peves', '79095690', 11, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'PUENTE TABLA', 'BU0029', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('c2acae9d-c471-47dc-9676-890eb7354110', 'Jhon Escobar', 'PEND-053', NULL, NULL, NULL, NULL, 'BU0119', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('1f173230-99b8-4acb-9f32-0bf34fd2e84d', 'Alessandro Escobar', 'PEND-054', NULL, NULL, NULL, NULL, 'BU0120', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('ff1d1c66-86e1-45e6-9387-251a3b76867f', 'Axel Chamorro Valdés', '42469906', 9, 'MASCULINO', 'JOSE OLAYA', 'BELLAVISTA', 'BU0101', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('da1c9ad2-bfc4-48cc-bf1f-6b97b2b2ca34', 'Fernando Toscano', '63080652', 15, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'PUENTE TABLA', 'BU0088', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('92f09772-e75f-40ee-9906-b8dc14007b3c', 'Jadiel Oré Llamo', '90200150', 10, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'BELLAVISTA', 'BU0061', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('80ccc51a-3563-4216-9d4c-3505096d7683', 'Víctor Gamero Quispe', '78896343', 10, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'CASA BLANCA', 'BU0102', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('51ed2458-f85e-4ddf-b673-532c914379bd', 'Luis Simón Manrique', 'OOOO9OOO', 13, 'MASCULINO', 'GERARDO', 'PUENTE TABLA', 'BU0069', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('902d2f2f-fc14-4758-b6c3-d319b300aa75', 'Narshell De La Cadena Atoccsa', '79816126', 9, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'SEÑOR DE LOS MILAGROS', 'BU0010', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('aaa60e90-18c4-4fd3-8aa5-5afd08cc4fe1', 'Dustin De La Cadena Atoccsa', '62734150', 15, 'FEMENINO', 'GERARDO SALOMÓN MEJÍA SACO', 'SEÑOR DE LOS MILAGROS', 'BU0009', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('640d5c68-5090-4c44-ab8a-e541fb255b9f', 'Alondra Yanac Segobia', '81006843', 12, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'TRANQUERA DE FIERRO', 'BU0060', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('338d581c-5a4f-450d-9bed-e96e2ae7fdc2', 'Aracely Melma Del Carpio', '63804191', 13, 'FEMENINO', 'GERARDO SALOMÓN MEJÍA SACO', 'BELLAVISTA', 'BU0006', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('3bb63cea-0fd9-4fb4-8681-670aca447535', 'Dylan Malla Del Carpio', '91717948', 6, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'BELLAVISTA', 'BU0007', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('507454b8-ab28-4f40-b3b3-d51b604b05cf', 'Luis Ortiz Felix', '81447670', 10, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'COLINA', 'BU0097', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('afb9aa81-6cc0-49ac-ad98-8b6879588e90', 'Eikel Guevara Gutiérrez', '81447679', 11, 'MASCULINO', 'JOSE OLAYA', 'CASA BLANCA', 'BU0063', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('6c0987cb-9544-401b-a3e9-4ed9ffacfd34', 'Azumy Contreras Gutiérrez', '79325037', 10, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'MIRAFLORES', 'BU0049', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('4185ef0c-166b-4033-a361-2e8cd78217c0', 'Julieth Cárdenas Uchuypoma', '79782254', 10, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'CASA BLANCA', 'BU0095', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('7b2464ad-de81-4ec6-b7b3-c57e294db522', 'Yohana Cárdenas Uchuypoma', '91778636', 6, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'CASA BLANCA', 'BU0094', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('fc7d9227-eccf-4d76-9379-143a4ebcbecf', 'Tannert Ferreyra Manco', 'PEND-070', NULL, NULL, NULL, NULL, 'BU0121', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('22fc0fbe-6692-471b-8eb0-186b2eac9667', 'Sofía Gutiérrez Manco', '78621674', 10, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'PUENTE TABLA', 'BU0019', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('9f9653f9-0cb5-4821-b660-e09cf1d9acb4', 'Diego Ramírez Pariona', '32454677', 10, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'SEÑOR DE LOS MILAGROS', 'BU0067', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('361160b8-97e5-4282-8bdd-4ea0a8ad3df8', 'Celeste Carhuaz Samaniego', '79503799', 10, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'MIRAFLORES', 'BU0085', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('bf6fd801-4ace-45e2-a116-de607a23225d', 'Rossy Carhuaz Samaniego', '90671418', 6, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'MIRAFLORES', 'BU0112', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('a77266f0-fe93-4d84-9ee3-feea98177817', 'Zoe Padilla La Madrid', 'PEND-075', NULL, NULL, NULL, NULL, 'BU0122', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('a38d6247-7261-40a0-99ae-9217fed933a3', 'Cielo Catalán Chávez', '90154416', 8, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'TRANQUERA DE FIERRO', 'BU0079', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('b6b70bab-34d6-4ae7-b507-74b27abe1f24', 'Ivana Huara Escalante', 'PEND-077', NULL, NULL, NULL, NULL, 'BU0123', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('43e9292d-f403-41e5-b93e-819f8eeef00b', 'Joaquín Cullanco Coronado', '35721777', 7, 'MASCULINO', 'JOSÉ OLAYA BALANDRA', 'MOTOBOMBA', 'BU0111', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('c0ef4ae8-82ee-46e5-aebc-bc14979da7e1', 'Lucas Caro Padilla', '77986036', 13, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'PUENTE TABLA', 'BU0082', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('8ac2f0ae-9b21-4086-82dc-facff31946d0', 'Gimena Caro Padilla', '79815957', 8, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'PUENTE TABLA', 'BU0083', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('12f36116-e137-43fe-ab13-f97d9290dda5', 'Priscila Caro Padilla', '91051218', 7, 'FEMENINO', 'JOSÉ OLAYA BALANDRA', 'PUENTE TABLA', 'BU0084', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('8e6a150e-3349-4694-9f5b-1b7e503d1936', 'Kit Itzel Hurtado Ccasani', '91403806', 6, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'CASA BLANCA', 'BU0053', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('d8669a13-7298-4250-ac07-4f7dcf8c558f', 'Astrid Pérez Quispe', '63287310', 15, 'FEMENINO', 'GERARDO SALOMÓN MEJÍA SACO', 'PUENTE TABLA', 'BU0066', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('583e8af6-728e-441d-8603-294959acecdb', 'Ley Gutiérrez Cuba', '80919098', 13, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'SEÑOR DE LOS MILAGROS', 'BU0003', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('ddcdcdfd-6d3f-4749-a95a-bd4c2a33e3aa', 'Alex Chuco Chamorro', 'PEND-085', NULL, NULL, NULL, NULL, 'BU0124', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('0c1325d3-e89d-49ad-8e0e-056c15d85d1a', 'Ostin Chuco Chamorro', 'PEND-086', NULL, NULL, NULL, NULL, 'BU0125', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('6300e002-9ad0-4987-8fec-f722a543aaa1', 'Emmanuel Sing Salas', '80919089', NULL, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'BELLAVISTA', 'BU0025', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('6f8ca584-f3a7-4020-bb72-2a8c1bb1da97', 'Edinson Campos Salas', '90854403', 8, 'MASCULINO', 'REINA DE LOS ANGELES', 'BELLAVISTA', 'BU0026', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('d432987c-89ed-4df5-a0c3-29ae59f9c70d', 'Luis Sotelo Parra', 'PEND-089', NULL, NULL, NULL, NULL, 'BU0126', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('b8a4e4c0-d9e8-4c18-af7a-cd2456117266', 'Cristhian Catalán Castro', '79795838', 10, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'TRANQUERA DE FIERRO', 'BU0064', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('e2851a99-e3cb-470a-bee3-7a6769000efc', 'Yelitza Narváez Allazo', '79931093', 9, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'PUENTE TABLA', 'BU0091', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('6cfe723a-fdff-46a3-aebc-4ef50ce2b129', 'Gabriel Narváez Allazo', '62168676', 14, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'PUENTE TABLA', 'BU0092', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('f1c728cd-c7ef-46d9-8012-90533ea283d0', 'Caleb Narváez Allazo', '91768210', 6, 'MASCULINO', 'JOSÉ OLAYA BALANDRA', 'PUENTE TABLA', 'BU0090', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('ae797447-5e10-4817-bc0c-3a0214f42490', 'Rosa Medina Aylas', '63247999', 15, 'FEMENINO', 'GERARDO SALOMÓN MEJÍA', 'CASA BLANCA', 'BU0103', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('e01f6684-1a74-4194-bae6-2e1c3c3c75d5', 'Snayder Medina Aylas', '44248995', 11, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'CASA BLANCA', 'BU0104', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('e1a10946-7946-4794-890c-18093fe759db', 'Derrick Tomaylla Vargas', '79041562', 10, 'MASCULINO', 'JOSÉ OLAYA BALANDRA', 'BELLAVISTA', 'BU0073', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('a21e345e-65c8-4a01-9d8f-fc52b902d986', 'Enders Tomaylla Vargas', '90060453', 9, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'BELLAVISTA', 'BU0074', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('5111360a-5ff7-4f8b-a213-1ed70b2abb56', 'Thiago Peves', 'PEND-098', NULL, NULL, NULL, NULL, 'BU0127', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('0b7e64fb-23a7-4f36-a30e-9c1a01f30aa3', 'Sofía Peves', 'PEND-099', NULL, NULL, NULL, NULL, 'BU0128', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('ad0c6a32-fae0-489a-a4c1-f1d701418e56', 'Sofía Ramírez Allazo', '61802142', 15, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'PUENTE TABLA', 'BU0020', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('8bb1610b-d1ad-4318-9f36-34e42153aeef', 'José Ramírez Allazo', '630807', 13, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'PUENTE TABLA', 'BU0056', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('3b19768c-a779-4ad2-8dcb-59353c2b456d', 'Nashley Julián Ccoyllo', 'PEND-102', NULL, NULL, NULL, NULL, 'BU0129', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('6a52a5dd-01ed-4724-af56-04a8c5faee40', 'Annie Quispe Segura', 'PEND-103', NULL, NULL, NULL, NULL, 'BU0130', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('e2673006-cc25-4c10-be78-05bb9b9a6e0f', 'Víctor Quispe Segura', 'PEND-104', NULL, NULL, NULL, NULL, 'BU0131', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('3d27e5e7-6bad-4c4a-adf9-2572111ce5d4', 'Eduardo Quispe Campos', '63080659', NULL, 'MASCULINO', 'GERARDO SALOMÓN MEJÍA SACO', 'TRANQUERA DE FIERRO', 'BU0030', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('b7849ccd-2e6c-42cd-aadc-a4771f48f309', 'Dominik Parimiachi Campos', '90051612', 11, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'TRANQUERA DE FIERRO', 'BU0008', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('562c41b9-3c0d-482e-9968-50cd7974f1cb', 'Celeste', 'PEND-107', NULL, NULL, NULL, NULL, 'BU0132', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('f4c8de77-9345-4c5b-b250-6d3b0807cd53', 'Naim Machacuay Carrasco', '79081208', 9, 'MASCULINO', 'JOSE OLAYA BALANDRA', 'CASA BLANCA', 'BU0045', true, 'active');
INSERT INTO social_bus_escolar (id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ('8d0b6fd6-be35-47e6-9ead-58b7b1b50ef1', 'Orietha Machacuay Carrasco', '15441558', NULL, 'FEMENINO', 'JOSE OLAYA BALANDRA', 'CASA BLANCA', 'BU0035', true, 'active');

-- 5) Relación alumno ↔ apoderado
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('96bc9edb-24d0-4b8e-9a9e-4db44b3f244a', '34753a4a-0f02-4984-be7d-143b248b12ed', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('0cac0358-5120-4a7b-925b-4fee1bb67fd7', '34753a4a-0f02-4984-be7d-143b248b12ed', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('b7e3cf35-47fb-4a6a-9ed0-76bd91c51a1b', '6c383cce-cabd-438f-adb3-bb96d647b1a4', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('902ec17e-40da-41d9-94b9-efd90464e89f', '6c383cce-cabd-438f-adb3-bb96d647b1a4', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('1ad2fa24-e6de-4962-b964-34df0adcc281', '6c383cce-cabd-438f-adb3-bb96d647b1a4', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('22cc58b6-675f-4f88-832d-b9bc31b6e7de', '5ae6b815-5bbf-45ce-bcd4-995aa6c720f2', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('e8ac27b9-6056-498c-9b3f-706301a5d6a0', '5ae6b815-5bbf-45ce-bcd4-995aa6c720f2', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('55c9450c-3566-4e9b-b4b3-36f6b02a4739', '9fe40d48-ac09-4c21-a8e6-96536a77e792', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('1ffb6d07-6d17-4d97-b571-f005154f5b6a', '9fe40d48-ac09-4c21-a8e6-96536a77e792', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('95a2796b-51a6-40a8-a177-df0476e58905', 'c7295d0d-be2f-496a-83b9-aa9c6d954348', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('a00d4b2a-fe20-4b93-9938-776192ed6d8d', '97d4bec8-2a05-4c95-86be-d494ff230a2e', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('492a4d2f-6619-42af-9bea-92f33077a481', 'c1d038f7-2d9a-4b9e-8b77-b2cd69b291f7', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('05b4a432-d964-4947-9b18-99fd1d37dbf6', '80f5f70c-bb12-447b-912d-cd7042aae744', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('4a9702e7-1d71-4b61-9100-caef86cb3f5d', '80f5f70c-bb12-447b-912d-cd7042aae744', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('7fbaa7cc-28e8-4e80-971c-fb907c675fe8', 'ab88d9bc-744d-41ad-a950-3336c5f7719f', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('0179cb41-80c5-410c-abcb-3b80b9c70d76', '00c620cc-d233-4388-b8af-934380ff9f59', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('17732644-29c3-404b-97ec-c59e13fcfb2e', '34ac5acc-60cc-4afd-b98c-d8273ada6e84', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('d1d5bc28-960d-4d08-a2e3-605100049e33', '273da5ae-ccf5-498b-a54a-9fe8abf5a992', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('f4733bed-e1f1-4909-b103-b54cf419cf58', 'fe39452f-ce8c-4804-a74b-41473f5d7a5e', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('748d420d-9d4b-44ec-8ad1-09c1979339e1', 'd9e05315-7a4f-4cd3-977d-71e747498930', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('7f6ad914-c76c-4297-9b70-f38e72ad3736', 'd9e05315-7a4f-4cd3-977d-71e747498930', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('4e540544-373d-4bda-9903-9e7d297ec10e', '0f3f1f9b-f610-4119-a482-744f65414265', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('ac824d9a-6cc3-44e8-bb9e-310c7bcab683', '0f3f1f9b-f610-4119-a482-744f65414265', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('4cb3eec8-f0f2-4e75-8c6c-834d1c796feb', '0f3f1f9b-f610-4119-a482-744f65414265', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('df18922f-ed18-45ad-ae51-fb70596cb633', '5594ceda-0574-46f5-b6e7-93d50dcaa929', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('c6bcb160-e228-43e1-9e62-61bcbad9d893', '0c9a33e5-e626-4fb8-bf3d-9207c108dc96', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('5dd86047-25ae-4d65-a2d1-5d5b4d2e2a04', '0c9a33e5-e626-4fb8-bf3d-9207c108dc96', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('08bc9dd5-c622-41c1-96b1-91d86777e3ba', 'db15fceb-05da-4eca-b28a-6be1fd0c4551', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('b6fce94b-ee6b-4c1e-8db2-ef1d4e77b656', 'db15fceb-05da-4eca-b28a-6be1fd0c4551', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('adc67441-5911-42d5-8270-e9f5ebea6a2d', '82117717-f70b-4cf7-9b3a-54f990f6345d', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('b36abf4e-9c4c-4ea6-b242-78dab68fc335', '82117717-f70b-4cf7-9b3a-54f990f6345d', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('784d2140-d961-465c-9a8d-2e1edf7c2dae', 'baa2e952-d3bf-4697-9694-fa25407ab99a', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('002b7a58-c199-4f21-911c-0985b416e7ce', '41b63a5c-7276-4c8f-8127-88ba1f5d4d7d', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('65173593-603f-41c4-993d-23813f084a8d', '41b63a5c-7276-4c8f-8127-88ba1f5d4d7d', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('8ebb68f8-c160-4368-b6b4-0e2d08544137', '667a5c29-c306-4823-ad2b-1ce720c13544', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('e5143a62-fe57-4eed-a86a-211c04058643', 'd5e678d8-4040-40a5-a8aa-3af97be45230', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('e9acc5c6-1a7f-4a5a-9588-af4481a73375', '00ed4a51-73aa-4470-81d9-23fec5b7432d', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('6bb856c0-e1b2-4ff7-8ee3-8c589c0a5f27', '00ed4a51-73aa-4470-81d9-23fec5b7432d', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('375faee8-fecf-47be-a987-a6ecd745da23', '0c69c557-fce7-4453-b269-44974289ae79', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('16de4da6-5f59-46a4-8f21-08f31ce0e475', '0c69c557-fce7-4453-b269-44974289ae79', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('bb7c73e1-51ee-4154-afd9-7feb503b0ac5', 'dfd9a132-1c7e-4f0d-a055-c6f94f4b695c', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('04f57b9a-acdf-40b6-9fe1-31b391ab2963', 'a5e7b4c2-af3c-4351-9827-d78eb7933c9e', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('43ef9964-c7dc-4e82-9435-09e3537b6a2a', 'a5e7b4c2-af3c-4351-9827-d78eb7933c9e', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('92dca59b-3c38-47fe-aac3-a4b1f59a3cb2', '08bb5595-991b-43bb-a48e-8852607c0dc0', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('77663d0b-257d-4d41-98ec-ae67f67f6503', '08bb5595-991b-43bb-a48e-8852607c0dc0', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('ade7a575-b2ad-4d75-a9b0-61ecb9ff6f8d', '08bb5595-991b-43bb-a48e-8852607c0dc0', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('061f4dba-652a-4c55-82af-7c38c63ec089', 'cf2669a4-b207-4789-89a4-dc5d2e8464d9', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('13d63037-44de-44b1-b0fe-f0ff253ab6f8', '8cbbbfdc-4d05-4cc0-8c06-aa0b40c92b81', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('6c16faf8-e105-4f71-92be-2679692e954c', '8cbbbfdc-4d05-4cc0-8c06-aa0b40c92b81', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('ba641308-2b70-45e3-9f64-2b4ae575f88a', '8cbbbfdc-4d05-4cc0-8c06-aa0b40c92b81', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('b2e56bd6-1484-4ce0-9698-447d2f46a441', 'e9e55f2b-fd71-436d-858f-728102dc2a40', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('1e653316-4231-470e-bdf0-8f6dc7beee01', '118cdff9-4b80-4bc4-9a07-2be226c843eb', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('c2acae9d-c471-47dc-9676-890eb7354110', '0da084bc-98ac-4f81-9df5-a34df4d5832e', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('1f173230-99b8-4acb-9f32-0bf34fd2e84d', '0da084bc-98ac-4f81-9df5-a34df4d5832e', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('ff1d1c66-86e1-45e6-9387-251a3b76867f', '2c484048-81ce-4797-b8f6-7d1361b0cfef', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('da1c9ad2-bfc4-48cc-bf1f-6b97b2b2ca34', '4ecb97f7-4da7-46f6-bccc-66bc1890e807', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('92f09772-e75f-40ee-9906-b8dc14007b3c', 'd957b704-fb83-4bfc-99c9-e3f613a090a6', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('80ccc51a-3563-4216-9d4c-3505096d7683', '80dca274-884f-42dd-a926-ec0e6f43643c', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('51ed2458-f85e-4ddf-b673-532c914379bd', '636d3fcb-500d-4dbf-b10e-590b76606795', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('902d2f2f-fc14-4758-b6c3-d319b300aa75', '9335551b-ea7a-4e65-be77-2d41dd237f88', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('aaa60e90-18c4-4fd3-8aa5-5afd08cc4fe1', '9335551b-ea7a-4e65-be77-2d41dd237f88', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('640d5c68-5090-4c44-ab8a-e541fb255b9f', 'cdd4fabc-424f-4604-8716-df7ff16ef7da', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('338d581c-5a4f-450d-9bed-e96e2ae7fdc2', 'ee6b76ef-44c9-4d19-887e-829797ad0efb', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('3bb63cea-0fd9-4fb4-8681-670aca447535', 'ee6b76ef-44c9-4d19-887e-829797ad0efb', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('507454b8-ab28-4f40-b3b3-d51b604b05cf', 'dfdabab4-be06-4f31-bb88-4e7763557cde', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('afb9aa81-6cc0-49ac-ad98-8b6879588e90', '851ce364-7522-429c-b391-d810f7615f54', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('6c0987cb-9544-401b-a3e9-4ed9ffacfd34', 'cb6b9381-18c9-4612-9da5-91d2688d7520', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('4185ef0c-166b-4033-a361-2e8cd78217c0', '7a6ff555-a19c-47df-84db-d45c1b40938c', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('7b2464ad-de81-4ec6-b7b3-c57e294db522', '7a6ff555-a19c-47df-84db-d45c1b40938c', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('fc7d9227-eccf-4d76-9379-143a4ebcbecf', 'c6fe5499-2951-449e-89d8-d297879b3566', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('22fc0fbe-6692-471b-8eb0-186b2eac9667', 'c6fe5499-2951-449e-89d8-d297879b3566', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('9f9653f9-0cb5-4821-b660-e09cf1d9acb4', '21a071f6-9b67-46c2-b6da-7160991624ef', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('361160b8-97e5-4282-8bdd-4ea0a8ad3df8', 'de83106a-bbb5-4231-9d59-995ae4ede771', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('bf6fd801-4ace-45e2-a116-de607a23225d', 'de83106a-bbb5-4231-9d59-995ae4ede771', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('a77266f0-fe93-4d84-9ee3-feea98177817', 'c1acb29f-8639-460e-8967-e2b82cdd1ac0', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('a38d6247-7261-40a0-99ae-9217fed933a3', 'fdb8ff30-1a33-48de-8afc-364935efcd96', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('b6b70bab-34d6-4ae7-b507-74b27abe1f24', '31dcce7d-5086-4687-bfe2-04062c189c38', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('43e9292d-f403-41e5-b93e-819f8eeef00b', '246c244e-4b1c-467d-ad8a-a2faa5a41b99', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('c0ef4ae8-82ee-46e5-aebc-bc14979da7e1', '1d7c0a1f-0691-45fd-84f3-bdca33fab5a1', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('8ac2f0ae-9b21-4086-82dc-facff31946d0', '1d7c0a1f-0691-45fd-84f3-bdca33fab5a1', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('12f36116-e137-43fe-ab13-f97d9290dda5', '1d7c0a1f-0691-45fd-84f3-bdca33fab5a1', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('8e6a150e-3349-4694-9f5b-1b7e503d1936', '6e59dbcf-64ae-4d12-b55e-83028c224e6b', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('d8669a13-7298-4250-ac07-4f7dcf8c558f', '5247701b-adb1-4969-9f31-435dd4ee3e12', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('583e8af6-728e-441d-8603-294959acecdb', 'bdd72fe4-dba9-4ace-abfc-474dc96e2fd1', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('ddcdcdfd-6d3f-4749-a95a-bd4c2a33e3aa', '029541d3-bc54-455f-84dc-d2175be96880', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('0c1325d3-e89d-49ad-8e0e-056c15d85d1a', '029541d3-bc54-455f-84dc-d2175be96880', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('6300e002-9ad0-4987-8fec-f722a543aaa1', 'bc607ad3-d62a-4571-a7ca-95877a80f1a3', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('6f8ca584-f3a7-4020-bb72-2a8c1bb1da97', 'bc607ad3-d62a-4571-a7ca-95877a80f1a3', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('d432987c-89ed-4df5-a0c3-29ae59f9c70d', 'c6a99329-9fc0-49dc-b41a-6e810d5fc6ee', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('b8a4e4c0-d9e8-4c18-af7a-cd2456117266', '7c49b4f8-2267-4ca4-9fc1-ae361af38318', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('e2851a99-e3cb-470a-bee3-7a6769000efc', 'f3de7239-42fa-4a76-806e-929dfafd4028', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('6cfe723a-fdff-46a3-aebc-4ef50ce2b129', 'f3de7239-42fa-4a76-806e-929dfafd4028', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('f1c728cd-c7ef-46d9-8012-90533ea283d0', 'f3de7239-42fa-4a76-806e-929dfafd4028', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('ae797447-5e10-4817-bc0c-3a0214f42490', '84ceea70-f27b-4b31-b118-3f40afb2b2bb', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('e01f6684-1a74-4194-bae6-2e1c3c3c75d5', '84ceea70-f27b-4b31-b118-3f40afb2b2bb', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('e1a10946-7946-4794-890c-18093fe759db', 'e266e68e-b729-41a2-bfc7-adbadc5a1f07', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('a21e345e-65c8-4a01-9d8f-fc52b902d986', 'e266e68e-b729-41a2-bfc7-adbadc5a1f07', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('5111360a-5ff7-4f8b-a213-1ed70b2abb56', '88b2a6f2-549b-4d12-a41f-7040942a490f', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('0b7e64fb-23a7-4f36-a30e-9c1a01f30aa3', '88b2a6f2-549b-4d12-a41f-7040942a490f', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('ad0c6a32-fae0-489a-a4c1-f1d701418e56', '0e247d76-958f-4406-a18f-2f274a1c2532', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('8bb1610b-d1ad-4318-9f36-34e42153aeef', '0e247d76-958f-4406-a18f-2f274a1c2532', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('3b19768c-a779-4ad2-8dcb-59353c2b456d', '7e2bf5b4-bbb2-49a1-b4e5-b997af5a86e9', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('6a52a5dd-01ed-4724-af56-04a8c5faee40', 'a4df8cc0-0cbc-4c2f-b1d5-e124b4a188dd', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('e2673006-cc25-4c10-be78-05bb9b9a6e0f', 'a4df8cc0-0cbc-4c2f-b1d5-e124b4a188dd', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('3d27e5e7-6bad-4c4a-adf9-2572111ce5d4', 'f04b95cc-3ee8-48bc-8903-02180fcef03a', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('b7849ccd-2e6c-42cd-aadc-a4771f48f309', 'f04b95cc-3ee8-48bc-8903-02180fcef03a', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('562c41b9-3c0d-482e-9968-50cd7974f1cb', 'f04b95cc-3ee8-48bc-8903-02180fcef03a', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('f4c8de77-9345-4c5b-b250-6d3b0807cd53', 'b60b25d6-4317-413e-bd0f-86d2f342eab0', 'apoderado', true);
INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ('8d0b6fd6-be35-47e6-9ead-58b7b1b50ef1', 'b60b25d6-4317-413e-bd0f-86d2f342eab0', 'apoderado', true);

COMMIT;

-- Match con BD anterior: 89/109
-- Alumnos con QR reutilizado: 89
-- Apoderados sin teléfono: 3