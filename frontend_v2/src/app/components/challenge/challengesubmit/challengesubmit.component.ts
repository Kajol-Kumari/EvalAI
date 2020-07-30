import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { ChallengeService } from '../../../services/challenge.service';
import { Router, ActivatedRoute } from '@angular/router';
import { EndpointsService } from '../../../services/endpoints.service';

/**
 * Component Class
 */
@Component({
  selector: 'app-challengesubmit',
  templateUrl: './challengesubmit.component.html',
  styleUrls: ['./challengesubmit.component.scss']
})
export class ChallengesubmitComponent implements OnInit {
 /**
  * Url error Message
  */
inputErrorMessage = '';
validFileUrl = false;
isSubmissionUsingUrl: any;

  /**
   * Is user logged in
   */
  isLoggedIn = false;

  /**
   * Challenge object
   */
  challenge: any;

  /**
   * Is challenge host
   */
  isChallengeHost: any;

  /**
   * Router public instance
   */
  routerPublic: any;

  /**
   * Is user a participant
   */
  isParticipated: any;

  /**
   * Is challenge currently active
   */
  isActive: any;

  /**
   * Submission error
   */
  submissionError = '';

  /**
   * Guidelines text
   */
  submissionGuidelines = '';

  /**
   * Stores the attributes format and phase ID for all the phases of a challenge.
   */
  submissionMetaAttributes = [];

  /**
   * Stores the attributes while making a submission for a selected phase.
   */
  metaAttributesforCurrentSubmission = null;

  /**
   * Form fields name
   */
  submitForm = 'formsubmit';

  /**
   * Challenge phases list
   */
  phases = [];

  /**
   * Filtered challenge phases
   */
  filteredPhases = [];

  /**
   * Selected phase object
   */
  selectedPhase = null;

  /**
   * Cli version
   */
  cliVersion = '';

  /**
   * Auth token
   */
  authToken = '';

  /**
   * Phase selection type (radio button or select box)
   */
  phaseSelectionType = 'radioButton';

  /**
   * Select box list type
   */
  phaseSelectionListType = 'phase';

  /**
   * Api call inside the modal to edit the submission guidelines
   */
  apiCall: any;

  /**
   * Selected phase submission conditions
   * @param showSubmissionDetails show the selected phase submission details
   * @param showClock when max submissions per day exceeded
   * @param maxExceeded max submissions exceeded
   * @param remainingSubmissions remaining submissions details
   * @param maxExceededMessage message for max submissions exceeded
   * @param clockMessage message for max submissions per day exceeded
   */
  selectedPhaseSubmissions = {
    showSubmissionDetails: false,
    showClock: false,
    maxExceeded: false,
    remainingSubmissions: {},
    maxExceededMessage: '',
    clockMessage: ''
  };

  /**
   * Phase remaining submissions for docker based challenge
   */
  phaseRemainingSubmissions: any;

  /**
   * Flog for phase if submissions max exceeded, details, clock
   */
  phaseRemainingSubmissionsFlags = {};

  /**
   * Phase remaining submissions countdown (days, hours, minutes, seconds)
   */
  phaseRemainingSubmissionsCountdown = {};

  /**
   * Clock variables
   * @param days number of days remaining
   * @param hours number of hours remaining
   * @param minutes number of minutes remaining
   * @param seconds number of seconds remaining
   * @param remainingTime remaining time (in seconds) for submission of a challenge phase
   */
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  remainingTime: number;

  /**
   * Is clock initialised
   */
  isClockStarted: boolean;

  /**
   * Set interval timer
   */
  timer: any;

  /**
   * Component Class
   */
  @ViewChildren('formsubmit')
  components: QueryList<ChallengesubmitComponent>;

  /**
   * Constructor.
   * @param route  ActivatedRoute Injection.
   * @param router  Router Injection.
   * @param authService  AuthService Injection.
   * @param globalService  GlobalService Injection.
   * @param apiService  ApiService Injection.
   * @param challengeService  ChallengeService Injection.
   */
  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute,
              private challengeService: ChallengeService, private globalService: GlobalService, private apiService: ApiService,
              private endpointsService: EndpointsService) { }

  /**
   * Component on intialization.
   */
  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.isLoggedIn = true;
    }
    this.routerPublic = this.router;
    this.challengeService.currentChallenge.subscribe(challenge => {
      this.challenge = challenge;
      this.isActive = this.challenge['is_active'];
      this.submissionGuidelines = this.challenge['submission_guidelines'];
      if (this.challenge.cli_version !== null) {
        this.cliVersion = this.challenge.cli_version;
      }
    });
    this.challengeService.currentParticipationStatus.subscribe(status => {
      this.isParticipated = status;
      if (!status) {
        this.router.navigate(['../participate'], {relativeTo: this.route});
      }
    });
    this.challengeService.currentPhases.subscribe(
      phases => {
        this.phases = phases;
        this.filteredPhases = this.phases.filter(phase => phase['is_active'] === true);
        for (let j = 0; j < this.phases.length; j++) {
          if (phases[j].is_public === false) {
            this.phases[j].showPrivate = true;
          }
        }
    });

    this.challengeService.isChallengeHost.subscribe(status => {
      this.isChallengeHost = status;
    });

    this.challengeService.isChallengeHost.subscribe(status => {
      this.isChallengeHost = status;
    });

    if (this.challenge.is_docker_based) {
      this.displayDockerSubmissionInstructions(this.challenge.id, this.isParticipated);
    }
    this.authToken = this.globalService.getAuthToken();
  }

  /**
   * @param SELF current context
   * @param eachPhase particular phase of a challenge
   */
  countDownTimer(SELF, eachPhase) {
    if (!SELF.isClockStarted) {
      SELF.remainingTime = parseInt(eachPhase.limits.remaining_time, 10);
    }
    SELF.days = Math.floor(SELF.remainingTime / 24 / 60 / 60);
    const hoursLeft = Math.floor(SELF.remainingTime - SELF.days * 86400);
    SELF.hours = Math.floor(hoursLeft / 3600);
    const minutesLeft = Math.floor(hoursLeft - SELF.hours * 3600);
    SELF.minutes = Math.floor(minutesLeft / 60);
    SELF.seconds = Math.floor(SELF.remainingTime % 60);

    if (SELF.days < 10) {
      SELF.days = '0' + SELF.days;
    }
    if (SELF.hours < 10) {
      SELF.hours = '0' + SELF.hours;
    }
    if (SELF.minutes < 10) {
      SELF.minutes = '0' + SELF.minutes;
    }
    if (SELF.seconds < 10) {
      SELF.seconds = '0' + SELF.seconds;
    }

    // Used when the challenge is docker based
    SELF.phaseRemainingSubmissionsCountdown[eachPhase.id] = {
        'days': SELF.days,
        'hours': SELF.hours,
        'minutes': SELF.minutes,
        'seconds': SELF.seconds
    };
    if (SELF.remainingTime === 0) {
      SELF.selectedPhaseSubmissions.showSubmissionDetails = true;
      SELF.phaseRemainingSubmissionsFlags[eachPhase.id] = 'showSubmissionDetails';
    } else {
      SELF.remainingTime--;
    }
    SELF.isClockStarted = true;
  }

  /**
   * @param challenge challenge id
   * @param isParticipated Is user a participant
   */
  displayDockerSubmissionInstructions(challenge, isParticipated) {
    if (isParticipated) {
      const API_PATH = this.endpointsService.challengeSubmissionsRemainingURL(challenge);
      const SELF = this;
      this.apiService.getUrl(API_PATH).subscribe(
        data => {
          SELF.phaseRemainingSubmissions = data;
          const details = SELF.phaseRemainingSubmissions.phases;
          for (let i = 0; i < details.length; i++) {
            if (details[i].limits.submission_limit_exceeded === true) {
              SELF.phaseRemainingSubmissionsFlags[details[i].id] = 'maxExceeded';
            } else if (details[i].limits.remaining_submissions_today_count > 0) {
              SELF.phaseRemainingSubmissionsFlags[details[i].id] = 'showSubmissionDetails';
            } else {
              const eachPhase = details[i];
              SELF.phaseRemainingSubmissionsFlags[details[i].id] = 'showClock';
              setInterval(function () {
                  SELF.countDownTimer(SELF, eachPhase);
              }, 1000);
              SELF.countDownTimer(SELF, eachPhase);
            }
          }
        },
        err => {
          SELF.globalService.handleApiError(err);
        },
        () => console.log('Remaining submissions fetched for docker based challenge')
      );
    }
  }

  /**
   * Fetch remaining submissions for a challenge phase.
   * @param challenge  challenge id
   * @param phase  phase id
   */
  fetchRemainingSubmissions(challenge, phase) {
    const API_PATH = this.endpointsService.challengeSubmissionsRemainingURL(challenge);
    const SELF = this;
    clearInterval(SELF.timer);
    SELF.isClockStarted = false;
    SELF.selectedPhaseSubmissions.showClock = false;
    SELF.selectedPhaseSubmissions.showSubmissionDetails = false;
    SELF.selectedPhaseSubmissions.maxExceeded = false;
    this.apiService.getUrl(API_PATH).subscribe(
      data => {
        let phaseDetails, eachPhase;
        for (let i = 0; i < data.phases.length; i++) {
          if (data.phases[i].id === phase) {
            eachPhase = data.phases[i];
            phaseDetails = data.phases[i].limits;
            break;
          }
        }
        if (phaseDetails.submission_limit_exceeded) {
          this.selectedPhaseSubmissions.maxExceeded = true;
          this.selectedPhaseSubmissions.maxExceededMessage = phaseDetails.message;
        } else if (phaseDetails.remaining_submissions_today_count > 0) {
          this.selectedPhaseSubmissions.remainingSubmissions = phaseDetails;
          this.selectedPhaseSubmissions.showSubmissionDetails = true;
        } else {
          this.selectedPhaseSubmissions.showClock = true;
          this.selectedPhaseSubmissions.clockMessage = phaseDetails;
          SELF.timer = setInterval(function () {
            SELF.countDownTimer(SELF, eachPhase);
          }, 1000);
          SELF.countDownTimer(SELF, eachPhase);
        }
      },
      err => {
        SELF.globalService.handleApiError(err);
      },
      () => {
        console.log('Remaining submissions fetched for challenge-phase', challenge, phase);
      }
    );
  }

  /**
   * Fetch Meta Attributes for a particular challenge phase.
   * @param challenge  challenge id
   * @param phase  phase id
   */
  getMetaDataDetails(challenge, phaseId) {
    const API_PATH = this.endpointsService.challengePhaseURL(challenge);
    const SELF = this;
    this.apiService.getUrl(API_PATH).subscribe(
      data => {
        for (let i = 0; i < data.count; i++) {
          if (data.results[i].submission_meta_attributes !== undefined && data.results[i].submission_meta_attributes !== null) {
            const attributes = data.results[i].submission_meta_attributes;
            attributes.forEach(function (attribute) {
              if (attribute['type'] === 'checkbox') {
                attribute['values'] = [];
              } else {
                attribute['value'] = null;
              }
            });
            data = { 'phaseId': data.results[i].id, 'attributes': attributes };
            this.submissionMetaAttributes.push(data);
          } else {
            const detail = { 'phaseId': data.results[i].id, 'attributes': null };
            this.submissionMetaAttributes.push(detail);
          }
        }
        // Loads attributes of a phase into this.submissionMetaAttributes
        // this.metaAttributesforCurrentSubmission = this.submissionMetaAttributes.find(function (element) {
        //   return element['phaseId'] === phaseId;
        // }).attributes;
        this.metaAttributesforCurrentSubmission = [
          {
                    'name': 'TextAttribute',
                    'description': 'This is a text attribute',
                    'type': 'text',
                    'required': true,
                    'value': null
                  },
                  {
                    'name': 'OptionAttribute',
                    'description': 'This is a single option attribute',
                    'type': 'radio',
                    'options': [
                      'Option A',
                      'Option B',
                      'Option C'
                    ],
                    'value': null
                  },
                  {
                    'name': 'MultipleChoiceAttribute',
                    'description': 'This is a multiple choice attributh',
                    'type': 'checkbox',
                    'options': [
                      'alpha',
                      'beta',
                      'gamma'
                    ],
                    'values': []
                  },
                  {
                    'name': 'BooleanField',
                    'description': 'Select true or false',
                    'type': 'boolean',
                    'required': true,
                    'value': null
                  }
                ];
      },
      err => {
        SELF.globalService.handleApiError(err);
      },
      () => { }
    );
  }

  /**
   * Clear the data of metaAttributesforCurrentSubmission
   */
  clearMetaAttributeValues() {
    if (this.metaAttributesforCurrentSubmission != null) {
      this.metaAttributesforCurrentSubmission.forEach(function (attribute) {
        if (attribute.type === 'checkbox') {
          attribute.values = [];
        } else {
          attribute.value = null;
        }
      });
    }
  }

  /**
   * Called when a phase is selected (from child components)
   */
  phaseSelected() {
    const SELF = this;
    return (phase) => {
      SELF.selectedPhase = phase;
      if (SELF.challenge['id'] && phase['id']) {
        SELF.getMetaDataDetails(SELF.challenge['id'], phase['id']);
        SELF.fetchRemainingSubmissions(SELF.challenge['id'], phase['id']);
        SELF.clearMetaAttributeValues();
      }
    };
  }

  /**
   * Form validate function
   */
  formValidate() {
    if (this.selectedPhaseSubmissions.remainingSubmissions['remaining_submissions_today_count']) {
      this.globalService.formValidate(this.components, this.formSubmit, this);
    } else {
      this.globalService.showToast('info', 'You have exhausted today\'s submission limit');
    }
  }

  /**
   * Form submit function
   * @param self  context value of this
   */
  formSubmit(self) {
    self.submissionError = '';
    let metaValue = true;
    const submissionFile = self.globalService.formItemForLabel(self.components, 'input_file').fileValue;
    const submissionProjectUrl = self.globalService.formValueForLabel(self.components, 'project_url');
    const submissionPublicationUrl = self.globalService.formValueForLabel(self.components, 'publication_url');
    const submissionFileUrl = self.globalService.formItemForLabel(self.components, 'file_url');
    const regex = new RegExp(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/);
    if (!self.isSubmissionUsingUrl && (submissionFile === null || submissionFile === '')) {
      self.submissionError = 'Please upload file!';
      return;
    } else if (self.isSubmissionUsingUrl && (submissionFileUrl !== '' && !self.validFileUrl)) {
      self.submissionError = 'Please enter a valid Submission URL!';
      return;
    } else if (self.selectedPhase['id'] === undefined) {
      self.submissionError = 'Please select phase!';
      return;
    } else if (submissionProjectUrl !== '' && !regex.test(submissionProjectUrl)) {
      self.submissionError = 'Please provide a valid project url!';
      return;
    } else if (submissionPublicationUrl !== '' && !regex.test(submissionPublicationUrl)) {
      self.submissionError = 'Please provide a valid publication url!';
      return;
    }
    if (self.metaAttributesforCurrentSubmission != null) {
      self.metaAttributesforCurrentSubmission.forEach(attribute => {
        if (attribute.value === null || attribute.value === undefined) {
          metaValue = false;
        }
      });
    }
    if (metaValue !== true) {
      self.submissionError = 'Please provide input for meta attributes!';
      return;
    }

    const FORM_DATA: FormData = new FormData();
    FORM_DATA.append('status', 'submitting');
    if (!self.isSubmissionUsingUrl) {
      FORM_DATA.append('input_file', self.globalService.formItemForLabel(self.components, 'input_file').fileSelected);
    } else if (self.validFileUrl && self.isSubmissionUsingUrl) {
      FORM_DATA.append('file_url', self.globalService.formValueForLabel(self.components, 'file_url'));
    }
    FORM_DATA.append('method_name', self.globalService.formValueForLabel(self.components, 'method_name'));
    FORM_DATA.append('method_description', self.globalService.formValueForLabel(self.components, 'method_description'));
    FORM_DATA.append('project_url', self.globalService.formValueForLabel(self.components, 'project_url'));
    FORM_DATA.append('publication_url', self.globalService.formValueForLabel(self.components, 'publication_url'));
    FORM_DATA.append('submission_metadata', JSON.stringify(self.metaAttributesforCurrentSubmission));
    self.challengeService.challengeSubmission(
      self.challenge['id'],
      self.selectedPhase['id'],
      FORM_DATA,
      () => {
        if (!self.isSubmissionUsingUrl) {
          self.globalService.setFormValueForLabel(self.components, 'input_file', null);
        } else if (self.validFileUrl && self.isSubmissionUsingUrl) {
          self.globalService.setFormValueForLabel(self.components, 'file_url', '');
          }
        self.globalService.setFormValueForLabel(self.components, 'method_name', '');
        self.globalService.setFormValueForLabel(self.components, 'method_description', '');
        self.globalService.setFormValueForLabel(self.components, 'project_url', '');
        self.globalService.setFormValueForLabel(self.components, 'publication_url', '');
      }
    );
  }

  copyTextToClipboard(ref: HTMLElement) {
    const textBox = document.createElement('textarea');
    textBox.style.position = 'fixed';
    textBox.style.left = '0';
    textBox.style.top = '0';
    textBox.style.opacity = '0';
    textBox.value = ref.innerText.split('$ ')[1];
    document.body.appendChild(textBox);
    textBox.focus();
    textBox.select();
    document.execCommand('copy');
    document.body.removeChild(textBox);

    this.globalService.showToast('success', 'Command copied to clipboard');
  }

  /**
   * Edit submission guidelines
   */
  editSubmissionGuideline() {
    const SELF = this;
    SELF.apiCall = (params) => {
      const BODY = JSON.stringify(params);
      SELF.apiService.patchUrl(
        SELF.endpointsService.editChallengeDetailsURL(SELF.challenge.creator.id, SELF.challenge.id),
        BODY
      ).subscribe(
        data => {
          SELF.submissionGuidelines = data.submission_guidelines;
          SELF.globalService.showToast('success', 'The submission guidelines is successfully updated!', 5);
        },
        err => {
          SELF.globalService.handleApiError(err, true);
          SELF.globalService.showToast('error', err);
        },
        () => {}
      );
    };

    const PARAMS = {
      title: 'Edit Submission Guidelines',
      label: 'submission_guidelines',
      isEditorRequired: true,
      editorContent: this.challenge.submission_guidelines,
      confirm: 'Submit',
      deny: 'Cancel',
      confirmCallback: SELF.apiCall
    };
    SELF.globalService.showModal(PARAMS);
  }

  validateInput(inputValue) {
    const regex = new RegExp(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/);
    const validExtensions = ['json', 'zip', 'csv'];
    if (this.isSubmissionUsingUrl) {
      const extension = inputValue.split('.').pop();
      if (regex.test(inputValue) && validExtensions.includes(extension)) {
        this.inputErrorMessage = '';
        this.validFileUrl = true;
      } else {
        this.inputErrorMessage = 'Please enter a valid Submission URL!';
        this.validFileUrl = false;
      }
    }
  }

  // unchecking checked options
  toggleSelection(attribute, value) {
    const idx = attribute.values.indexOf(value);
    if (idx > -1) {
      attribute.values.splice(idx, 1);
    } else {
      attribute.values.push(value);
    }
  }

}
