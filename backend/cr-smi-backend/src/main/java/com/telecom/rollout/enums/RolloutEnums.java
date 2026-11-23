package com.telecom.rollout.enums;

public class RolloutEnums {
        public enum NodeType { ALL, SPINE, LEAF, SWITCH, CM, MASTER, WORKER, SMF, KVM, UPF, CIMC  }
    public enum Platform { CNDP,SMI }
    public enum ExecutionMode { MANUAL, SINGLE_CLICK }
    public enum CrStatus { PLANNED, IN_PROGRESS, COMPLETED, FAILED }
    public enum CheckStatus { PENDING, IN_PROGRESS, PASS, FAIL, BLOCKED }
    public enum SrSeverity { S1, S2, S3, S4 }
    public enum SrStatus { OPEN, INVESTIGATING, RESOLVED, CLOSED }
}
