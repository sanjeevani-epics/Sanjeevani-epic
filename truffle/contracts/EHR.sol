pragma solidity >=0.4.22 <0.9.0;

contract EHR {
  struct Record {
    string cid;
    string fileName;
    address patientId;
    address doctorId;
    uint256 timeAdded;
    string metadata;
  }

  struct Consent {
    address doctorId;
    string purpose;
    uint256 validUntil;
    bool isAuthorized;
  }

  struct ConsentLog {
    address doctorId;
    string action; // "Granted", "Revoked"
    string purpose;
    uint256 timestamp;
    uint256 validUntil;
  }

  struct Patient {
    address id;
    Record[] records;
    address[] consentedDoctors;
    ConsentLog[] consentHistory;
  }

  struct Doctor {
    address id;
  }

  mapping(address => Patient) public patients;
  mapping(address => Doctor) public doctors;

  // Mapping approach for O(1) checks. patientId -> (doctorId -> Consent)
  mapping(address => mapping(address => Consent)) public patientConsents;

  event PatientAdded(address patientId);
  event DoctorAdded(address doctorId);
  event RecordAdded(string cid, address patientId, address doctorId);
  event ConsentUpdated(address patientId, address doctorId, string action);

  // modifiers
  modifier senderExists() {
    require(doctors[msg.sender].id == msg.sender || patients[msg.sender].id == msg.sender, 'Sender does not exist');
    _;
  }

  modifier patientExists(address patientId) {
    require(patients[patientId].id == patientId, 'Patient does not exist');
    _;
  }

  modifier senderIsDoctor() {
    require(doctors[msg.sender].id == msg.sender, 'Sender is not a doctor');
    _;
  }

  modifier senderIsPatient() {
    require(patients[msg.sender].id == msg.sender, 'Sender is not a patient');
    _;
  }

  // functions
  function addPatient(address _patientId) public senderIsDoctor {
    require(patients[_patientId].id != _patientId, 'This patient already exists.');
    patients[_patientId].id = _patientId;

    emit PatientAdded(_patientId);
  }

  function addDoctor() public {
    require(doctors[msg.sender].id != msg.sender, 'This doctor already exists.');
    doctors[msg.sender].id = msg.sender;

    emit DoctorAdded(msg.sender);
  }

  function addRecord(
    string memory _cid,
    string memory _fileName,
    address _patientId,
    string memory _metadata
  ) public senderIsDoctor patientExists(_patientId) {
    // Explicit consent enforcement for writing records implicitly granted if authorized
    Consent memory c = patientConsents[_patientId][msg.sender];
    require(
      c.isAuthorized == true && c.validUntil > block.timestamp,
      'Doctor does not have active consent to upload records for this patient'
    );

    Record memory record = Record(_cid, _fileName, _patientId, msg.sender, block.timestamp, _metadata);
    patients[_patientId].records.push(record);

    emit RecordAdded(_cid, _patientId, msg.sender);
  }

  // New function: Patient can add records themselves without requiring a doctor
  function addRecordAsSelf(
    string memory _cid,
    string memory _fileName,
    string memory _metadata
  ) public senderIsPatient {
    require(patients[msg.sender].id == msg.sender, 'Patient does not exist');

    // Doctor address set to address(0) to indicate self-uploaded record
    Record memory record = Record(_cid, _fileName, msg.sender, address(0), block.timestamp, _metadata);
    patients[msg.sender].records.push(record);

    emit RecordAdded(_cid, msg.sender, address(0));
  }

  function getRecords(address _patientId) public view patientExists(_patientId) returns (Record[] memory) {
    if (msg.sender == _patientId) {
      // Patient viewing own records
      return patients[_patientId].records;
    }

    // Doctor checking
    require(doctors[msg.sender].id == msg.sender, 'Sender is not a recognized doctor');
    Consent memory c = patientConsents[_patientId][msg.sender];
    require(c.isAuthorized == true, 'Not authorized to view these records');
    require(c.validUntil > block.timestamp, 'Consent has expired');

    return patients[_patientId].records;
  }

  function grantAccess(address _doctorId, string memory _purpose, uint256 _durationInSeconds) public senderIsPatient {
    require(doctors[_doctorId].id == _doctorId, 'Target address is not a registered doctor');

    uint256 validUntil = block.timestamp + _durationInSeconds;

    Consent storage c = patientConsents[msg.sender][_doctorId];
    if (c.doctorId == address(0)) {
      // first time granting this doctor
      c.doctorId = _doctorId;
      patients[msg.sender].consentedDoctors.push(_doctorId);
    }
    c.purpose = _purpose;
    c.validUntil = validUntil;
    c.isAuthorized = true;

    ConsentLog memory clog = ConsentLog(_doctorId, 'Granted', _purpose, block.timestamp, validUntil);
    patients[msg.sender].consentHistory.push(clog);

    emit ConsentUpdated(msg.sender, _doctorId, 'Granted');
  }

  function revokeAccess(address _doctorId) public senderIsPatient {
    Consent storage c = patientConsents[msg.sender][_doctorId];
    require(c.isAuthorized == true, 'Doctor access is already revoked or never granted');

    c.isAuthorized = false;

    ConsentLog memory clog = ConsentLog(_doctorId, 'Revoked', c.purpose, block.timestamp, c.validUntil);
    patients[msg.sender].consentHistory.push(clog);

    emit ConsentUpdated(msg.sender, _doctorId, 'Revoked');
  }

  function getConsentedDoctors(address _patientId) public view patientExists(_patientId) returns (Consent[] memory) {
    address[] memory doctorAddresses = patients[_patientId].consentedDoctors;
    uint256 count = 0;

    for (uint i = 0; i < doctorAddresses.length; i++) {
      if (
        patientConsents[_patientId][doctorAddresses[i]].isAuthorized &&
        patientConsents[_patientId][doctorAddresses[i]].validUntil > block.timestamp
      ) {
        count++;
      }
    }

    Consent[] memory activeConsents = new Consent[](count);
    uint256 j = 0;
    for (uint i = 0; i < doctorAddresses.length; i++) {
      Consent memory c = patientConsents[_patientId][doctorAddresses[i]];
      if (c.isAuthorized && c.validUntil > block.timestamp) {
        activeConsents[j] = c;
        j++;
      }
    }
    return activeConsents;
  }

  function getConsentHistory(address _patientId) public view patientExists(_patientId) returns (ConsentLog[] memory) {
    require(msg.sender == _patientId || doctors[msg.sender].id == msg.sender, 'Unauthorized');
    return patients[_patientId].consentHistory;
  }

  function getSenderRole() public view returns (string memory) {
    if (doctors[msg.sender].id == msg.sender) {
      return 'doctor';
    } else if (patients[msg.sender].id == msg.sender) {
      return 'patient';
    } else {
      return 'unknown';
    }
  }

  function getPatientExists(address _patientId) public view senderIsDoctor returns (bool) {
    return patients[_patientId].id == _patientId;
  }
}
