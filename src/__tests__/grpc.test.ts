// FreeLang v9 — Phase 152: gRPC Tests

import { Interpreter } from '../interpreter';

describe('Phase 152: gRPC Support', () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Proto Parser — Tokenizer
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Proto Parser — Tokenize proto content', () => {
    const code = `
      (load "src/proto-parser.fl")
      (let [tokens (tokenize "message User { string name = 1; int32 age = 2; }")]
        {:count (= (count tokens) 15)
         :has-message (some (fn [t] (= t "message")) tokens)
         :has-brace (some (fn [t] (= t "{")) tokens)})
    `;
    const result = interp.eval(code);
    expect(result.count).toBe(true);
    expect(result['has-message']).toBe(true);
    expect(result['has-brace']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Proto Parser — Parse message
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Proto Parser — Parse message definition', () => {
    const code = `
      (load "src/proto-parser.fl")
      (let [schema (parse-proto "message User { string name = 1; int32 age = 2; }")
            msg (first (:messages schema))]
        {:type (= (:type msg) :message)
         :name (= (:name msg) "User")
         :fields (= (count (:fields msg)) 2)})
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.name).toBe(true);
    expect(result.fields).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Proto Parser — Field attributes
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Proto Parser — Extract field attributes', () => {
    const code = `
      (load "src/proto-parser.fl")
      (let [schema (parse-proto "message User { string name = 1; }")
            msg (first (:messages schema))
            field (first (:fields msg))]
        {:type (= (:type field) :string)
         :name (= (:name field) "name")
         :number (= (:number field) 1)})
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.name).toBe(true);
    expect(result.number).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Proto Parser — Parse service
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Proto Parser — Parse service definition', () => {
    const code = `
      (load "src/proto-parser.fl")
      (let [proto "service UserService { rpc GetUser(UserId) returns (User); }"
            schema (parse-proto proto)
            svc (first (:services schema))]
        {:type (= (:type svc) :service)
         :name (= (:name svc) "UserService")
         :methods (= (count (:methods svc)) 1)})
    `;
    const result = interp.eval(code);
    expect(result.type).toBe(true);
    expect(result.name).toBe(true);
    expect(result.methods).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Proto Parser — Get message by name
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Proto Parser — Get message by name', () => {
    const code = `
      (load "src/proto-parser.fl")
      (let [schema (parse-proto "message User { string name = 1; } message Post { string title = 1; }")
            user (get-message schema "User")
            post (get-message schema "Post")]
        {:user-found (not (nil? user))
         :post-found (not (nil? post))
         :user-name (= (:name user) "User")})
    `;
    const result = interp.eval(code);
    expect(result['user-found']).toBe(true);
    expect(result['post-found']).toBe(true);
    expect(result['user-name']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: gRPC Server — Create server
  // ─────────────────────────────────────────────────────────────────────────
  test('6. gRPC Server — Create gRPC server', () => {
    const code = `
      (load "src/grpc.fl")
      (let [server (create-grpc-server 50051)]
        {:has-port (= (:port server) 50051)
         :has-id (string? (:server-id server))
         :empty-services (= (count (:services server)) 0)})
    `;
    const result = interp.eval(code);
    expect(result['has-port']).toBe(true);
    expect(result['has-id']).toBe(true);
    expect(result['empty-services']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: gRPC Server — Register service
  // ─────────────────────────────────────────────────────────────────────────
  test('7. gRPC Server — Register service with methods', () => {
    const code = `
      (load "src/grpc.fl")
      (let [server (create-grpc-server 50051)
            methods [{:name "GetUser" :input "UserId" :output "User"}]
            updated (register-grpc-service server "UserService" methods)]
        {:registered (not (nil? (get (:services updated) "UserService")))
         :methods-count (= (count (get (:services updated) "UserService")) 1)})
    `;
    const result = interp.eval(code);
    expect(result.registered).toBe(true);
    expect(result['methods-count']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: gRPC Server — Register method handler
  // ─────────────────────────────────────────────────────────────────────────
  test('8. gRPC Server — Register RPC method handler', () => {
    const code = `
      (load "src/grpc.fl")
      (let [server (create-grpc-server 50051)
            handler (fn [id] {:id id :name "John"})
            updated (register-grpc-method server "UserService" "GetUser" handler)]
        {:handler-registered (not (nil? (get (:handlers updated) "UserService/GetUser")))
         :handler-callable (fn? (get (:handlers updated) "UserService/GetUser"))})
    `;
    const result = interp.eval(code);
    expect(result['handler-registered']).toBe(true);
    expect(result['handler-callable']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: gRPC Client — Create client
  // ─────────────────────────────────────────────────────────────────────────
  test('9. gRPC Client — Create gRPC client', () => {
    const code = `
      (load "src/grpc.fl")
      (let [client (create-grpc-client "localhost" 50051 "UserService")]
        {:host-ok (= (:host client) "localhost")
         :port-ok (= (:port client) 50051)
         :service-ok (= (:service-name client) "UserService")
         :has-breaker (not (nil? (:breaker client)))})
    `;
    const result = interp.eval(code);
    expect(result['host-ok']).toBe(true);
    expect(result['port-ok']).toBe(true);
    expect(result['service-ok']).toBe(true);
    expect(result['has-breaker']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: Message Serialization — Validate
  // ─────────────────────────────────────────────────────────────────────────
  test('10. Message Serialization — Validate message', () => {
    const code = `
      (load "src/grpc.fl")
      (let [fields [{:name "name" :type :string :modifier :required :number 1}
                    {:name "age" :type :int32 :modifier :optional :number 2}]
            valid-msg {:name "John" :age 30}
            invalid-msg {:age 30}]
        {:valid (validate-message valid-msg fields)
         :invalid (not (validate-message invalid-msg fields))})
    `;
    const result = interp.eval(code);
    expect(result.valid).toBe(true);
    expect(result.invalid).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 11: Message Serialization — Serialize
  // ─────────────────────────────────────────────────────────────────────────
  test('11. Message Serialization — Serialize message', () => {
    const code = `
      (load "src/grpc.fl")
      (let [fields [{:name "name" :type :string :number 1}
                    {:name "age" :type :int32 :number 2}]
            msg {:name "John" :age 30}
            serialized (serialize-message msg fields)]
        {:has-1 (contains? serialized "1")
         :has-2 (contains? serialized "2")
         :value-1 (= (get serialized "1") "John")
         :value-2 (= (get serialized "2") 30)})
    `;
    const result = interp.eval(code);
    expect(result['has-1']).toBe(true);
    expect(result['has-2']).toBe(true);
    expect(result['value-1']).toBe(true);
    expect(result['value-2']).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 12: Message Serialization — Deserialize
  // ─────────────────────────────────────────────────────────────────────────
  test('12. Message Serialization — Deserialize message', () => {
    const code = `
      (load "src/grpc.fl")
      (let [fields [{:name "name" :type :string :number 1}
                    {:name "age" :type :int32 :number 2}]
            data {"1" "John" "2" 30}
            deserialized (deserialize-message data fields)]
        {:name (= (:name deserialized) "John")
         :age (= (:age deserialized) 30)})
    `;
    const result = interp.eval(code);
    expect(result.name).toBe(true);
    expect(result.age).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 13: Metadata
  // ─────────────────────────────────────────────────────────────────────────
  test('13. Metadata — Create metadata', () => {
    const code = `
      (load "src/grpc.fl")
      (let [meta (create-metadata :timeout-ms 10000 :retries 5)]
        {:timeout (= (:timeout-ms meta) 10000)
         :retries (= (:retries meta) 5)
         :headers (map? (:headers meta))})
    `;
    const result = interp.eval(code);
    expect(result.timeout).toBe(true);
    expect(result.retries).toBe(true);
    expect(result.headers).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 14: Circuit Breaker Integration
  // ─────────────────────────────────────────────────────────────────────────
  test('14. Circuit Breaker Integration — gRPC client has breaker', () => {
    const code = `
      (load "src/grpc.fl")
      (let [client (create-grpc-client "localhost" 50051 "UserService")
            breaker (:breaker client)
            metrics (get-breaker-metrics breaker)]
        {:breaker-exists (not (nil? breaker))
         :is-closed (= (:state metrics) :closed)
         :healthy (:is-healthy metrics)})
    `;
    const result = interp.eval(code);
    expect(result['breaker-exists']).toBe(true);
    expect(result['is-closed']).toBe(true);
    expect(result.healthy).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 15: Proto + gRPC Integration
  // ─────────────────────────────────────────────────────────────────────────
  test('15. Proto + gRPC Integration — Full flow', () => {
    const code = `
      (load "src/grpc.fl")
      (let [proto-def "message User { string name = 1; int32 age = 2; } service UserService { rpc GetUser(UserId) returns (User); }"
            schema (parse-proto proto-def)
            msg (get-message schema "User")
            svc (get-service schema "UserService")
            method (get-method svc "GetUser")]
        {:msg-found (not (nil? msg))
         :svc-found (not (nil? svc))
         :method-found (not (nil? method))
         :method-input (= (:input method) "UserId")})
    `;
    const result = interp.eval(code);
    expect(result['msg-found']).toBe(true);
    expect(result['svc-found']).toBe(true);
    expect(result['method-found']).toBe(true);
    expect(result['method-input']).toBe(true);
  });
});
