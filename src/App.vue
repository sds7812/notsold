<template>
  <div class="container">
    <!-- 헤더 + 다운로드 버튼 flex row -->
    <div class="header-row">
      <header class="card header-card">
        <h1>📊 미판매관리</h1>
        <p>
          총판매수량이 0인 품목들을 필터링하여 A4용지에 프린트할 수 있는 엑셀
          파일로 가공합니다
        </p>
      </header>
      <div v-if="processedData.length > 0" class="download-btn-area">
        <button
          @click="printPage"
          class="btn btn-secondary"
          style="margin-top: 16px"
        >
          🖨️ PDF로 저장(인쇄)
        </button>
      </div>
    </div>

    <!-- 파일 업로드 섹션 -->
    <div class="card">
      <h2>파일 업로드</h2>
      <div
        class="upload-area"
        :class="{ dragover: isDragOver }"
        @drop="handleFileDrop"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
      >
        <div v-if="!uploadedFile">
          <div style="font-size: 48px; margin-bottom: 16px">📁</div>
          <h3>엑셀 파일을 여기에 드래그하거나 클릭하여 선택하세요</h3>
          <p>지원 형식: .xlsx, .xls, .csv</p>
        </div>
        <div v-else>
          <div style="font-size: 48px; margin-bottom: 16px">✅</div>
          <h3>{{ uploadedFile.name }}</h3>
          <p>파일 크기: {{ formatFileSize(uploadedFile.size) }}</p>
        </div>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls,.csv"
        @change="handleFileSelect"
        style="display: none"
      />
    </div>

    <!-- 데이터 분석 결과 -->
    <div v-if="excelData.length > 0" class="card">
      <h2>📈 데이터 분석 결과</h2>
      <div
        style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        "
      >
        <div class="stat-card">
          <div class="stat-number">{{ totalRows }}</div>
          <div class="stat-label">전체 품목 수</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ zeroSalesCount }}</div>
          <div class="stat-label">총판매수량 0 품목</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ percentage }}%</div>
          <div class="stat-label">0 품목 비율</div>
        </div>
      </div>

      <div v-if="zeroSalesData.length > 0" class="status success">
        ✅ 총판매수량이 0인 품목 {{ zeroSalesCount }}개를 발견했습니다. A4
        프린트용 파일을 생성할 수 있습니다.
      </div>
      <div v-else class="status error">
        ❌ 총판매수량이 0인 품목이 없습니다.
      </div>
    </div>

    <!-- 가공된 데이터 미리보기 -->
    <div v-if="processedData.length > 0" class="card" id="print-area">
      <h2 class="print-hide">📄 A4 프린트용 데이터 미리보기</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th v-for="(header, index) in processedHeaders" :key="index">
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in processedData" :key="rowIndex">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top: 16px; text-align: center">
        <span class="status info print-hide">
          A4 프린트용 데이터: {{ processedData.length }}행
        </span>
      </div>
    </div>

    <!-- 상태 메시지 -->
    <div v-if="statusMessage" class="card">
      <div :class="['status', statusType]">
        {{ statusMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

export default {
  name: 'App',
  data() {
    return {
      uploadedFile: null, // 업로드된 파일 객체
      excelData: [], // 원본 엑셀 데이터
      tableHeaders: [], // 테이블 헤더
      zeroSalesData: [], // 총판매수량이 0인 데이터
      processedData: [], // 가공된 데이터
      isDragOver: false, // 드래그 오버 상태
      statusMessage: '', // 상태 메시지
      statusType: 'info', // 상태 타입 (success, error, info)
      columnMappings: [
        { label: '순번', sourceColumn: '', key: 'sequence' },
        { label: '생성일자', sourceColumn: '', key: 'createDate' },
        { label: '대분류', sourceColumn: '', key: 'category' },
        { label: '품번', sourceColumn: '', key: 'productCode' },
        { label: '품명', sourceColumn: '', key: 'productName' },
        { label: '재고수량', sourceColumn: '', key: 'guideStock' },
        { label: '재고조사일자', sourceColumn: '', key: 'stockCheckDate' },
        { label: '재고조정수량', sourceColumn: '', key: 'stockAdjustment' },
        { label: '가감수량', sourceColumn: '', key: 'adjustmentQuantity' },
      ],
    };
  },
  computed: {
    // 전체 행 수
    totalRows() {
      return this.excelData.length;
    },
    // 총판매수량 0인 품목 수
    zeroSalesCount() {
      return this.zeroSalesData.length;
    },
    // 0 품목 비율
    percentage() {
      if (this.totalRows === 0) return 0;
      return Math.round((this.zeroSalesCount / this.totalRows) * 100);
    },
    // 가공된 헤더들
    processedHeaders() {
      return this.columnMappings.map((mapping) => mapping.label);
    },
  },
  methods: {
    // 파일 입력 트리거
    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    // 파일 선택 처리
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        this.processFile(file);
      }
    },

    // 파일 드롭 처리
    handleFileDrop(event) {
      event.preventDefault();
      this.isDragOver = false;

      const files = event.dataTransfer.files;
      if (files.length > 0) {
        this.processFile(files[0]);
      }
    },

    // 파일 처리
    async processFile(file) {
      try {
        // 파일 유효성 검사
        if (!this.isValidFile(file)) {
          this.showStatus('지원하지 않는 파일 형식입니다.', 'error');
          return;
        }

        this.uploadedFile = file;
        this.showStatus('파일을 처리하고 있습니다...', 'info');

        // 파일 읽기
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // 첫 번째 시트 가져오기
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          this.showStatus('파일에 데이터가 없습니다.', 'error');
          return;
        }

        // 헤더와 데이터 분리
        this.tableHeaders = jsonData[0];
        this.excelData = jsonData.slice(1);

        // 총판매수량 0인 품목 필터링
        this.filterZeroSalesData();

        // 컬럼 매핑 자동 설정 (엑셀 헤더 순서에 맞게 강제 지정, 순번은 자동 생성)
        this.autoMapColumns();

        this.showStatus('파일이 성공적으로 로드되었습니다!', 'success');
      } catch (error) {
        console.error('파일 처리 오류:', error);
        this.showStatus('파일 처리 중 오류가 발생했습니다.', 'error');
      }
    },

    // 총판매수량 0인 품목 필터링
    filterZeroSalesData() {
      // 총판매수량 컬럼 찾기
      const salesColumnIndex = this.findColumnIndex([
        '총판매수량',
        '총판매',
        '판매수량',
        '수량',
      ]);

      if (salesColumnIndex === -1) {
        this.showStatus(
          '총판매수량 컬럼을 찾을 수 없습니다. 수동으로 설정해주세요.',
          'error'
        );
        this.zeroSalesData = [];
        return;
      }

      // 총판매수량이 0인 행들 필터링
      this.zeroSalesData = this.excelData.filter((row) => {
        const salesValue = row[salesColumnIndex];
        return (
          salesValue === 0 ||
          salesValue === '0' ||
          salesValue === null ||
          salesValue === ''
        );
      });

      this.showStatus(
        `총판매수량 0인 품목 ${this.zeroSalesData.length}개를 발견했습니다.`,
        'success'
      );
    },

    // 컬럼 인덱스 찾기 (유사한 이름으로)
    findColumnIndex(keywords) {
      for (let i = 0; i < this.tableHeaders.length; i++) {
        const header = String(this.tableHeaders[i]).toLowerCase();
        for (const keyword of keywords) {
          if (header.includes(keyword.toLowerCase())) {
            return i;
          }
        }
      }
      return -1;
    },

    // 컬럼 매핑 자동 설정 (엑셀 헤더 순서에 맞게 강제 지정, 순번은 자동 생성)
    autoMapColumns() {
      this.columnMappings[0].sourceColumn = 'auto'; // 순번은 자동 생성
      this.columnMappings[1].sourceColumn = 5; // 생성일자
      this.columnMappings[2].sourceColumn = 7; // 대분류
      this.columnMappings[3].sourceColumn = 10; // 품번
      this.columnMappings[4].sourceColumn = 11; // 품명
      this.columnMappings[5].sourceColumn = 15; // 재고수량 (P열, 인덱스 15)
      this.columnMappings[6].sourceColumn = 16; // 재고조사일자 (Q열)
      this.columnMappings[7].sourceColumn = 17; // 재고조정수량 (R열)
      this.columnMappings[8].sourceColumn = 18; // 가감수량 (S열)
      // 데이터 가공 업데이트
      this.updateProcessedData();
    },

    // 파일 유효성 검사
    isValidFile(file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ];
      const validExtensions = ['.xlsx', '.xls', '.csv'];

      return (
        validTypes.includes(file.type) ||
        validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
      );
    },

    // 파일을 ArrayBuffer로 읽기
    readFileAsArrayBuffer(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    },

    // 데이터 가공 업데이트
    updateProcessedData() {
      if (this.zeroSalesData.length === 0) return;

      const processed = this.zeroSalesData.map((row, index) => {
        const processedRow = [];
        this.columnMappings.forEach((mapping, mapIdx) => {
          if (mapping.sourceColumn === 'auto') {
            // 순번 자동 생성
            processedRow.push(index + 1);
          } else if (mapping.sourceColumn !== '') {
            let value = row[mapping.sourceColumn] || '';
            // 생성일자(엑셀 일련번호)를 YYYY-MM-DD로 변환
            if (mapping.label === '생성일자') {
              value = this.formatExcelDate(value);
            }
            processedRow.push(value);
          } else {
            // 매핑되지 않은 컬럼은 빈 값
            processedRow.push('');
          }
        });
        return processedRow;
      });
      this.processedData = processed;
    },

    // 엑셀 일련번호를 YYYY-MM-DD로 변환하는 함수 (로컬 기준, 윤년 버그 보정)
    // 엑셀 기준: 1900-01-01이 1, 1900-02-28이 59, 1900-03-01이 61
    // (1900-02-29는 실제로 존재하지 않으나 엑셀은 60을 할당)
    formatExcelDate(excelSerial) {
      // 숫자가 아니면 그대로 반환
      if (isNaN(excelSerial)) return excelSerial;
      const serial = Number(excelSerial);
      if (serial < 1) return excelSerial;
      // 1900-02-29(60)은 실제로 존재하지 않으므로 1900-02-28로 처리
      let days = serial;
      if (days > 59) days -= 1; // 1900년 윤년 오류 보정
      // 엑셀의 1900-01-01은 일련번호 1, 실제로는 1899-12-31에서 시작
      const excelEpoch = new Date(1899, 11, 31); // 1899-12-31
      excelEpoch.setDate(excelEpoch.getDate() + days);
      // YYYY-MM-DD 포맷으로 반환 (로컬 기준)
      const yyyy = excelEpoch.getFullYear();
      const mm = String(excelEpoch.getMonth() + 1).padStart(2, '0');
      const dd = String(excelEpoch.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    },

    // 파일 크기 포맷팅
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // 상태 메시지 표시
    showStatus(message, type = 'info') {
      this.statusMessage = message;
      this.statusType = type;

      // 5초 후 메시지 자동 제거
      setTimeout(() => {
        this.statusMessage = '';
      }, 5000);
    },

    /**
     * 브라우저 인쇄 기능을 이용해 PDF로 저장할 수 있도록 함
     */
    printPage() {
      // 현재 날짜를 YYYYMMDD 형식으로 구함
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}${mm}${dd}`;
      // 인쇄 전 파일명 지정 (PDF로 저장 시에만 적용, 브라우저 인쇄는 자동)
      document.title = `미판매_${dateStr}`;
      window.print();
      // 인쇄 후 원래 타이틀로 복원 (사용자 경험 개선)
      setTimeout(() => {
        document.title = '미판매내역';
      }, 1000);
    },
  },
};
</script>
