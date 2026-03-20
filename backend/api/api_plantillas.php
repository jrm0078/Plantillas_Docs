<?php
header('Content-Type: application/json');
require_once '../config/config.php';

$action = $_GET['action'] ?? '';

// Obtener lista de plantillas disponibles
if ($action === 'listar') {
    try {
        $stmt = $pdo->query("
            SELECT cod_plantilla, nombre, descripcion, tipo_documento, estado
            FROM plantillas 
            ORDER BY nombre
        ");
        $plantillas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $plantillas]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener lista de plantillas activas
else if ($action === 'listar_activas') {
    try {
        $stmt = $pdo->query("
            SELECT cod_plantilla, nombre, descripcion, tipo_documento 
            FROM plantillas 
            WHERE estado = 1
            ORDER BY nombre
        ");
        $plantillas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $plantillas]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener plantilla específica con variables
else if ($action === 'obtener') {
    $cod = $_GET['cod'] ?? '';
    
    if (!$cod) {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    try {
        // Obtener plantilla
        $stmt = $pdo->prepare("
            SELECT cod_plantilla, nombre, descripcion, contenido 
            FROM plantillas 
            WHERE cod_plantilla = :cod
        ");
        $stmt->execute([':cod' => $cod]);
        $plantilla = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$plantilla) {
            echo json_encode(['success' => false, 'error' => 'Plantilla no encontrada']);
            exit;
        }
        
        // Obtener variables
        $stmt = $pdo->prepare("
            SELECT nombre_variable, etiqueta, tipo, requerido 
            FROM plantilla_variables 
            WHERE cod_plantilla = :cod
            ORDER BY orden
        ");
        $stmt->execute([':cod' => $cod]);
        $variables = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $plantilla['variables'] = $variables;
        
        echo json_encode(['success' => true, 'data' => $plantilla]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Reemplazar variables en plantilla
else if ($action === 'reemplazar') {
    $cod = $_GET['cod'] ?? '';
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$cod) {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    try {
        // Obtener plantilla
        $stmt = $pdo->prepare("SELECT contenido FROM plantillas WHERE cod_plantilla = :cod");
        $stmt->execute([':cod' => $cod]);
        $plantilla = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$plantilla) {
            echo json_encode(['success' => false, 'error' => 'Plantilla no encontrada']);
            exit;
        }
        
        // Reemplazar variables (-variable-)  con valores
        $contenido = $plantilla['contenido'];
        
        if ($data && is_array($data)) {
            foreach ($data as $variable => $valor) {
                // Reemplazar -variable- con el valor
                $contenido = str_replace('-' . $variable . '-', $valor, $contenido);
            }
        }
        
        echo json_encode(['success' => true, 'data' => ['contenido' => $contenido]]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Guardar documento generado
else if ($action === 'guardar_documento') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validaciones
    if (!$data['cod_plantilla'] || trim($data['cod_plantilla']) === '') {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    if (!$data['contenido_final'] || trim($data['contenido_final']) === '' || $data['contenido_final'] === '<p></p>') {
        echo json_encode(['success' => false, 'error' => 'El contenido del documento no puede estar vacío']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO documentos_generados 
            (cod_plantilla, id_cliente, contenido_final, datos_json)
            VALUES (:cod, :cliente, :contenido, :datos)
            ON DUPLICATE KEY UPDATE 
            contenido_final = :contenido, 
            datos_json = :datos,
            fecha_actualizacion = NOW()
        ");
        
        $stmt->execute([
            ':cod' => $data['cod_plantilla'],
            ':cliente' => $data['id_cliente'] ?? null,
            ':contenido' => $data['contenido_final'],
            ':datos' => json_encode($data['datos'] ?? [])
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Documento guardado correctamente']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener clientes (para selector)

else if ($action === 'clientes') {
    try {
        $stmt = $pdo->query("
            SELECT id, nombre, nif, email 
            FROM clientes 
            ORDER BY nombre
        ");
        $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $clientes]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener datos de cliente
else if ($action === 'cliente_datos') {
    $id = $_GET['id'] ?? '';
    
    if (!$id) {
        echo json_encode(['success' => false, 'error' => 'ID de cliente requerido']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM clientes WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$cliente) {
            echo json_encode(['success' => false, 'error' => 'Cliente no encontrado']);
            exit;
        }
        
        echo json_encode(['success' => true, 'data' => $cliente]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener datos filtrados para una plantilla
else if ($action === 'obtener_datos') {
    $cod_plantilla = $_GET['cod'] ?? '';
    $filtro = $_GET['filtro'] ?? '';
    
    if (!$cod_plantilla || !$filtro) {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla y filtro requeridos']);
        exit;
    }
    
    try {
        // Obtener configuración de la plantilla
        $stmt = $pdo->prepare("
            SELECT sql_consulta, campo_clave, tabla_origen 
            FROM plantillas 
            WHERE cod_plantilla = :cod
        ");
        $stmt->execute([':cod' => $cod_plantilla]);
        $plantilla = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$plantilla) {
            echo json_encode(['success' => false, 'error' => 'Plantilla no encontrada']);
            exit;
        }
        
        // Ejecutar la query con el filtro
        // Usar prepared statement con placeholder posicional
        $stmt = $pdo->prepare($plantilla['sql_consulta']);
        $stmt->execute([$filtro]);
        $datos = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$datos) {
            echo json_encode(['success' => false, 'error' => 'No se encontraron datos']);
            exit;
        }
        
        echo json_encode(['success' => true, 'data' => $datos]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Crear nueva plantilla
else if ($action === 'crear') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validaciones
    if (!$data['cod_plantilla'] || trim($data['cod_plantilla']) === '') {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    if (!$data['nombre'] || trim($data['nombre']) === '') {
        echo json_encode(['success' => false, 'error' => 'Nombre de plantilla requerido']);
        exit;
    }
    
    if (strlen($data['nombre']) < 3) {
        echo json_encode(['success' => false, 'error' => 'El nombre debe tener mínimo 3 caracteres']);
        exit;
    }
    
    if (!$data['contenido'] || trim($data['contenido']) === '') {
        echo json_encode(['success' => false, 'error' => 'El contenido HTML de la plantilla es requerido']);
        exit;
    }
    
    if (!$data['tabla_origen'] || trim($data['tabla_origen']) === '') {
        echo json_encode(['success' => false, 'error' => 'La tabla origen es requerida']);
        exit;
    }
    
    if (!$data['campo_clave'] || trim($data['campo_clave']) === '') {
        echo json_encode(['success' => false, 'error' => 'El campo clave es requerido']);
        exit;
    }
    
    if (!$data['sql_consulta'] || trim($data['sql_consulta']) === '') {
        echo json_encode(['success' => false, 'error' => 'La sentencia SQL es requerida']);
        exit;
    }
    
    // Validación comentada - permitir SQL con o sin parámetros
    // if (strpos($data['sql_consulta'], '?') === false) {
    //     echo json_encode(['success' => false, 'error' => 'La sentencia SQL debe contener ? como parámetro']);
    //     exit;
    // }
    
    if (strpos($data['cod_plantilla'], ' ') !== false) {
        echo json_encode(['success' => false, 'error' => 'El código de plantilla no puede contener espacios']);
        exit;
    }
    
    try {
        // INICIAR TRANSACCIÓN
        $pdo->beginTransaction();
        
        // 1. INSERTAR PLANTILLA
        $stmt = $pdo->prepare("
            INSERT INTO plantillas (cod_plantilla, nombre, descripcion, tipo_documento, contenido, tabla_origen, campo_clave, sql_consulta, estado)
            VALUES (:cod, :nombre, :desc, :tipo, :contenido, :tabla, :campo, :sql, :estado)
        ");
        
        $stmt->execute([
            ':cod' => $data['cod_plantilla'],
            ':nombre' => $data['nombre'],
            ':desc' => $data['descripcion'] ?? '',
            ':tipo' => $data['tipo_documento'] ?? '',
            ':contenido' => $data['contenido'],
            ':tabla' => $data['tabla_origen'] ?? '',
            ':campo' => $data['campo_clave'] ?? '',
            ':sql' => $data['sql_consulta'] ?? '',
            ':estado' => $data['estado'] ?? 1
        ]);
        
        // 2. INSERTAR VARIABLES (si existen)
        if (!empty($data['variables']) && is_array($data['variables'])) {
            $stmtVar = $pdo->prepare("
                INSERT INTO plantilla_variables (cod_plantilla, nombre_variable, etiqueta, tipo, requerido, orden)
                VALUES (:cod, :nombre, :etiqueta, :tipo, :requerido, :orden)
            ");
            
            foreach ($data['variables'] as $variable) {
                if (!empty($variable['nombre_variable']) && !empty($variable['etiqueta'])) {
                    $stmtVar->execute([
                        ':cod' => $data['cod_plantilla'],
                        ':nombre' => $variable['nombre_variable'],
                        ':etiqueta' => $variable['etiqueta'],
                        ':tipo' => $variable['tipo'] ?? 'text',
                        ':requerido' => $variable['requerido'] ?? 0,
                        ':orden' => $variable['orden'] ?? 999
                    ]);
                }
            }
        }
        
        // 3. INSERTAR FILTROS (si existen)
        if (!empty($data['filtros']) && is_array($data['filtros'])) {
            $stmtFilt = $pdo->prepare("
                INSERT INTO plantillas_filtros 
                (cod_plantilla, nombre_filtro, etiqueta, tipo_filtro, tabla_datos, campo_clave, campo_valor, sql_query, operador, orden, requerido, activo)
                VALUES (:cod, :nombre, :etiqueta, :tipo, :tabla, :campo_clave, :campo_valor, :sql_query, :operador, :orden, :requerido, :activo)
            ");
            
            foreach ($data['filtros'] as $filtro) {
                $tipo = $filtro['tipo_filtro'] ?? 'select_table';
                
                // Validar que teniendo el tipo correcto, incluya los datos necesarios
                if ($tipo === 'select_table' && empty($filtro['nombre_filtro']) && empty($filtro['etiqueta']) && empty($filtro['tabla_datos'])) {
                    continue;
                }
                if ($tipo === 'select_sql' && (empty($filtro['nombre_filtro']) || empty($filtro['sql_query']))) {
                    continue;
                }
                if (in_array($tipo, ['text', 'number', 'date']) && (empty($filtro['nombre_filtro']) || empty($filtro['etiqueta']))) {
                    continue;
                }
                
                $stmtFilt->execute([
                    ':cod' => $data['cod_plantilla'],
                    ':nombre' => $filtro['nombre_filtro'] ?? '',
                    ':etiqueta' => $filtro['etiqueta'] ?? '',
                    ':tipo' => $tipo,
                    ':tabla' => $filtro['tabla_datos'] ?? null,
                    ':campo_clave' => $filtro['campo_clave'] ?? 'id',
                    ':campo_valor' => $filtro['campo_valor'] ?? 'nombre',
                    ':sql_query' => $filtro['sql_query'] ?? null,
                    ':operador' => $filtro['operador'] ?? '=',
                    ':orden' => $filtro['orden'] ?? 999,
                    ':requerido' => $filtro['requerido'] ?? 1,
                    ':activo' => 1
                ]);
            }
        }
        
        // CONFIRMAR TRANSACCIÓN
        $pdo->commit();
        
        echo json_encode(['success' => true, 'message' => 'Plantilla creada correctamente']);
    } catch (Exception $e) {
        // ROLLBACK si algo falla
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Editar plantilla
else if ($action === 'editar') {
    $data = json_decode(file_get_contents('php://input'), true);
    $cod = $_GET['cod'] ?? '';
    
    // Validaciones
    if (!$cod || trim($cod) === '') {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    if (!$data['nombre'] || trim($data['nombre']) === '') {
        echo json_encode(['success' => false, 'error' => 'Nombre de plantilla requerido']);
        exit;
    }
    
    if (strlen($data['nombre']) < 3) {
        echo json_encode(['success' => false, 'error' => 'El nombre debe tener mínimo 3 caracteres']);
        exit;
    }
    
    if (!$data['contenido'] || trim($data['contenido']) === '') {
        echo json_encode(['success' => false, 'error' => 'El contenido HTML de la plantilla es requerido']);
        exit;
    }
    
    if (!$data['tabla_origen'] || trim($data['tabla_origen']) === '') {
        echo json_encode(['success' => false, 'error' => 'La tabla origen es requerida']);
        exit;
    }
    
    if (!$data['campo_clave'] || trim($data['campo_clave']) === '') {
        echo json_encode(['success' => false, 'error' => 'El campo clave es requerido']);
        exit;
    }
    
    if (!$data['sql_consulta'] || trim($data['sql_consulta']) === '') {
        echo json_encode(['success' => false, 'error' => 'La sentencia SQL es requerida']);
        exit;
    }
    
    // Validación comentada - permitir SQL con o sin parámetros
    // if (strpos($data['sql_consulta'], '?') === false) {
    //     echo json_encode(['success' => false, 'error' => 'La sentencia SQL debe contener ? como parámetro']);
    //     exit;
    // }
    
    try {
        // INICIAR TRANSACCIÓN
        $pdo->beginTransaction();
        
        // 1. ACTUALIZAR PLANTILLA
        $stmt = $pdo->prepare("
            UPDATE plantillas 
            SET nombre = :nombre, descripcion = :desc, tipo_documento = :tipo, 
                contenido = :contenido, tabla_origen = :tabla, campo_clave = :campo, 
                sql_consulta = :sql, estado = :estado
            WHERE cod_plantilla = :cod
        ");
        
        $stmt->execute([
            ':cod' => $cod,
            ':nombre' => $data['nombre'],
            ':desc' => $data['descripcion'] ?? '',
            ':tipo' => $data['tipo_documento'] ?? '',
            ':contenido' => $data['contenido'],
            ':tabla' => $data['tabla_origen'],
            ':campo' => $data['campo_clave'],
            ':sql' => $data['sql_consulta'],
            ':estado' => $data['estado'] ?? 1
        ]);
        
        // 2. ELIMINAR VARIABLES ANTIGUAS
        $pdo->prepare("DELETE FROM plantilla_variables WHERE cod_plantilla = :cod")
            ->execute([':cod' => $cod]);
        
        // 3. AGREGAR NUEVAS VARIABLES
        if (!empty($data['variables']) && is_array($data['variables'])) {
            $stmtVar = $pdo->prepare("
                INSERT INTO plantilla_variables (cod_plantilla, nombre_variable, etiqueta, tipo, requerido, orden)
                VALUES (:cod, :nombre, :etiqueta, :tipo, :requerido, :orden)
            ");
            
            foreach ($data['variables'] as $variable) {
                if (!empty($variable['nombre_variable']) && !empty($variable['etiqueta'])) {
                    $stmtVar->execute([
                        ':cod' => $cod,
                        ':nombre' => $variable['nombre_variable'],
                        ':etiqueta' => $variable['etiqueta'],
                        ':tipo' => $variable['tipo'] ?? 'text',
                        ':requerido' => $variable['requerido'] ?? 0,
                        ':orden' => $variable['orden'] ?? 999
                    ]);
                }
            }
        }
        
        // 4. ELIMINAR FILTROS ANTIGUOS
        $pdo->prepare("DELETE FROM plantillas_filtros WHERE cod_plantilla = :cod")
            ->execute([':cod' => $cod]);
        
        // 5. AGREGAR NUEVOS FILTROS
        if (!empty($data['filtros']) && is_array($data['filtros'])) {
            $stmtFilt = $pdo->prepare("
                INSERT INTO plantillas_filtros 
                (cod_plantilla, nombre_filtro, etiqueta, tipo_filtro, tabla_datos, campo_clave, campo_valor, sql_query, operador, orden, requerido, activo)
                VALUES (:cod, :nombre, :etiqueta, :tipo, :tabla, :campo_clave, :campo_valor, :sql_query, :operador, :orden, :requerido, :activo)
            ");
            
            foreach ($data['filtros'] as $filtro) {
                $tipo = $filtro['tipo_filtro'] ?? 'select_table';
                
                // Validar que teniendo el tipo correcto, incluya los datos necesarios
                if ($tipo === 'select_table' && (empty($filtro['nombre_filtro']) || empty($filtro['etiqueta']) || empty($filtro['tabla_datos']))) {
                    continue;
                }
                if ($tipo === 'select_sql' && (empty($filtro['nombre_filtro']) || empty($filtro['sql_query']))) {
                    continue;
                }
                if (in_array($tipo, ['text', 'number', 'date']) && (empty($filtro['nombre_filtro']) || empty($filtro['etiqueta']))) {
                    continue;
                }
                
                $stmtFilt->execute([
                    ':cod' => $cod,
                    ':nombre' => $filtro['nombre_filtro'] ?? '',
                    ':etiqueta' => $filtro['etiqueta'] ?? '',
                    ':tipo' => $tipo,
                    ':tabla' => $filtro['tabla_datos'] ?? null,
                    ':campo_clave' => $filtro['campo_clave'] ?? 'id',
                    ':campo_valor' => $filtro['campo_valor'] ?? 'nombre',
                    ':sql_query' => $filtro['sql_query'] ?? null,
                    ':operador' => $filtro['operador'] ?? '=',
                    ':orden' => $filtro['orden'] ?? 999,
                    ':requerido' => $filtro['requerido'] ?? 1,
                    ':activo' => 1
                ]);
            }
        }
        
        // CONFIRMAR TRANSACCIÓN
        $pdo->commit();
        
        echo json_encode(['success' => true, 'message' => 'Plantilla actualizada correctamente']);
    } catch (Exception $e) {
        // ROLLBACK si algo falla
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Eliminar plantilla
else if ($action === 'eliminar') {
    $cod = $_GET['cod'] ?? '';
    
    if (!$cod) {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM plantillas WHERE cod_plantilla = :cod");
        $stmt->execute([':cod' => $cod]);
        
        echo json_encode(['success' => true, 'message' => 'Plantilla eliminada correctamente']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener plantilla completa para editar
else if ($action === 'obtener_completa') {
    $cod = $_GET['cod'] ?? '';
    
    if (!$cod) {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    try {
        // OBTENER PLANTILLA
        $stmt = $pdo->prepare("SELECT * FROM plantillas WHERE cod_plantilla = :cod");
        $stmt->execute([':cod' => $cod]);
        $plantilla = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$plantilla) {
            echo json_encode(['success' => false, 'error' => 'Plantilla no encontrada']);
            exit;
        }
        
        // OBTENER VARIABLES
        $stmt = $pdo->prepare("
            SELECT id, nombre_variable, etiqueta, tipo, requerido, orden
            FROM plantilla_variables
            WHERE cod_plantilla = :cod
            ORDER BY orden
        ");
        $stmt->execute([':cod' => $cod]);
        $variables = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // OBTENER FILTROS
        $stmt = $pdo->prepare("
            SELECT id, nombre_filtro, etiqueta, tipo_filtro, tabla_datos, campo_clave, campo_valor, sql_query, operador, orden, requerido, activo
            FROM plantillas_filtros
            WHERE cod_plantilla = :cod
            ORDER BY orden
        ");
        $stmt->execute([':cod' => $cod]);
        $filtros = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $plantilla['variables'] = $variables;
        $plantilla['filtros'] = $filtros;
        
        echo json_encode(['success' => true, 'data' => $plantilla]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// NUEVO: Obtener filtros configurados para una plantilla con sus valores posibles
else if ($action === 'obtener_filtros') {
    $cod_plantilla = $_GET['cod'] ?? '';
    
    if (!$cod_plantilla) {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    try {
        // Obtener filtros configurados para esta plantilla
        $stmt = $pdo->prepare("
            SELECT id, nombre_filtro, etiqueta, tipo_filtro, tabla_datos, campo_clave, campo_valor, sql_query, operador, orden, requerido
            FROM plantillas_filtros
            WHERE cod_plantilla = :cod AND activo = 1
            ORDER BY orden
        ");
        $stmt->execute([':cod' => $cod_plantilla]);
        $filtros = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Para cada filtro, cargar los valores posibles (solo para SELECT)
        foreach ($filtros as &$filtro) {
            $tipo = $filtro['tipo_filtro'] ?? 'select_table';
            $filtro['valores'] = [];
            $filtro['error'] = null;
            
            // Solo cargar valores para filtros de tipo SELECT
            if ($tipo === 'select_table') {
                try {
                    $tabla = $filtro['tabla_datos'];
                    $campo_clave = $filtro['campo_clave'];
                    $campo_valor = $filtro['campo_valor'];
                    
                    // Sanitizar nombres de tabla y campos
                    $tabla = preg_replace('/[^a-zA-Z0-9_]/', '', $tabla);
                    $campo_clave = preg_replace('/[^a-zA-Z0-9_]/', '', $campo_clave);
                    $campo_valor = preg_replace('/[^a-zA-Z0-9_]/', '', $campo_valor);
                    
                    $sql = "SELECT {$campo_clave} as id, {$campo_valor} as valor FROM {$tabla} WHERE activo = 1 ORDER BY {$campo_valor}";
                    try {
                        $stmt_valores = $pdo->query($sql);
                        $filtro['valores'] = $stmt_valores->fetchAll(PDO::FETCH_ASSOC);
                    } catch (Exception $e1) {
                        if (strpos($e1->getMessage(), 'activo') !== false) {
                            $sql = "SELECT {$campo_clave} as id, {$campo_valor} as valor FROM {$tabla} ORDER BY {$campo_valor}";
                            $stmt_valores = $pdo->query($sql);
                            $filtro['valores'] = $stmt_valores->fetchAll(PDO::FETCH_ASSOC);
                        } else {
                            throw $e1;
                        }
                    }
                } catch (Exception $e) {
                    $filtro['valores'] = [];
                    $filtro['error'] = $e->getMessage();
                }
            } 
            else if ($tipo === 'select_sql') {
                try {
                    $sql = $filtro['sql_query'];
                    if (!empty($sql)) {
                        $stmt_valores = $pdo->query($sql);
                        $resultados = $stmt_valores->fetchAll(PDO::FETCH_ASSOC);
                        
                        // Convertir resultados a formato [id, valor]
                        foreach ($resultados as $row) {
                            $keys = array_keys($row);
                            $filtro['valores'][] = [
                                'id' => $row[$keys[0]],
                                'valor' => $row[$keys[1] ?? $keys[0]]
                            ];
                        }
                    }
                } catch (Exception $e) {
                    $filtro['valores'] = [];
                    $filtro['error'] = $e->getMessage();
                }
            }
            // Para text, number, date no hay valores predefinidos
        }
        
        echo json_encode(['success' => true, 'data' => $filtros]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// NUEVO: Obtener datos con múltiples filtros (modificación mejorada)
else if ($action === 'obtener_datos_filtrados') {
    $cod_plantilla = $_GET['cod'] ?? '';
    $filtros_json = $_GET['filtros'] ?? '{}';
    
    if (!$cod_plantilla) {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    try {
        $filtros = json_decode($filtros_json, true);
        
        // Obtener configuración de la plantilla
        $stmt = $pdo->prepare("
            SELECT sql_consulta, campo_clave, tabla_origen 
            FROM plantillas 
            WHERE cod_plantilla = :cod
        ");
        $stmt->execute([':cod' => $cod_plantilla]);
        $plantilla = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$plantilla) {
            echo json_encode(['success' => false, 'error' => 'Plantilla no encontrada']);
            exit;
        }
        
        // Obtener filtros configurados de la BD
        $stmt = $pdo->prepare("
            SELECT nombre_filtro, tipo_filtro, sql_query, operador 
            FROM plantillas_filtros 
            WHERE cod_plantilla = :cod AND activo = 1 
            ORDER BY orden
        ");
        $stmt->execute([':cod' => $cod_plantilla]);
        $filtros_config = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Construir SQL con parámetros si es necesario
        $sql_consulta = $plantilla['sql_consulta'];
        $params = [];
        
        // Si hay filtros configurados, procesarlos en orden
        if (!empty($filtros_config)) {
            foreach ($filtros_config as $index => $filtro) {
                $nombre = $filtro['nombre_filtro'];
                $tipo = $filtro['tipo_filtro'] ?? 'select_table';
                $valor = $filtros[$nombre] ?? null;
                
                if ($valor === null || $valor === '') {
                    continue;
                }
                
                // El valor será un parámetro posicional
                $params[] = $valor;
            }
        }
        
        // Contar placeholders - soportar tanto ? como [[named_params]]
        $has_named_params = preg_match_all('/\[\[(\w+)\]\]/', $sql_consulta, $named_matches);
        $has_positional_params = strpos($sql_consulta, '?') !== false;
        
        if ($has_named_params) {
            // SQL con parámetros nombrados [[param_name]]
            $param_names = $named_matches[1];
            $param_values = [];
            
            foreach ($param_names as $param_name) {
                if (isset($filtros[$param_name])) {
                    $param_values[] = $filtros[$param_name];
                } else {
                    // Buscar valor en la jerarquía de filtros por nombre_filtro
                    $found = false;
                    foreach ($filtros_config as $filt) {
                        if ($filt['nombre_filtro'] === $param_name && isset($filtros[$param_name])) {
                            $param_values[] = $filtros[$param_name];
                            $found = true;
                            break;
                        }
                    }
                    if (!$found) {
                        $param_values[] = null;
                    }
                }
            }
            
            // Reemplazar [[param_name]] con ?
            $sql_consulta = preg_replace('/\[\[\w+\]\]/', '?', $sql_consulta);
            $params = $param_values;
        }
        
        // Si no hay filtros o SQL sin parámetros, ejecutar directamente
        if (empty($params)) {
            $placeholder_count = substr_count($sql_consulta, '?');
            
            if ($placeholder_count === 0) {
                $stmt = $pdo->prepare($sql_consulta);
                $stmt->execute();
                $datos = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$datos) {
                    echo json_encode(['success' => false, 'error' => 'No se encontraron datos']);
                    exit;
                }
                
                echo json_encode(['success' => true, 'data' => $datos]);
                exit;
            }
        }
        
        // Validar cantidad de parámetros
        $placeholder_count = substr_count($sql_consulta, '?');
        if (!empty($params) && count($params) !== $placeholder_count) {
            echo json_encode(['success' => false, 'error' => "Se esperaban {$placeholder_count} parámetros, se recibieron " . count($params)]);
            exit;
        }
        
        // Ejecutar query con parámetros
        $stmt = $pdo->prepare($sql_consulta);
        $stmt->execute($params);
        $datos = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$datos) {
            echo json_encode(['success' => false, 'error' => 'No se encontraron datos con los filtros aplicados']);
            exit;
        }
        
        echo json_encode(['success' => true, 'data' => $datos]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

else {
    echo json_encode(['success' => false, 'error' => 'Acción no válida']);
}
?>
