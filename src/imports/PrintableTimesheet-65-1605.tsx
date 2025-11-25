import imgDailySignatureCell from "figma:asset/cd04bc45849f8a45e78fa93a92fe300a37839257.png";
import imgImageTcf from "figma:asset/e496b3c659675b1f9399acaf1a235cbe1d77b03e.png";

function Column() {
  return <div className="absolute h-[564.688px] left-0 top-0 w-[40px]" data-name="Column" />;
}

function Column1() {
  return <div className="absolute h-[564.688px] left-[40px] top-0 w-[80px]" data-name="Column" />;
}

function Column2() {
  return <div className="absolute h-[564.688px] left-[120px] top-0 w-[80px]" data-name="Column" />;
}

function Column3() {
  return <div className="absolute h-[564.688px] left-[200px] top-0 w-[56px]" data-name="Column" />;
}

function Column4() {
  return <div className="absolute h-[564.688px] left-[256px] top-0 w-[377.688px]" data-name="Column" />;
}

function Column5() {
  return <div className="absolute h-[564.688px] left-[633.69px] top-0 w-[96px]" data-name="Column" />;
}

function ColumnGroup() {
  return (
    <div className="absolute h-[564.688px] left-[0.5px] top-[0.5px] w-[729.688px]" data-name="Column Group">
      <Column />
      <Column1 />
      <Column2 />
      <Column3 />
      <Column4 />
      <Column5 />
    </div>
  );
}

function Paragraph() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[4.09px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">Date</p>
    </div>
  );
}

function HeaderCell() {
  return (
    <div className="absolute h-[24.688px] left-0 top-0 w-[40px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph />
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[4.09px] w-[79px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[39.89px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">In Time</p>
    </div>
  );
}

function HeaderCell1() {
  return (
    <div className="absolute h-[24.688px] left-[40px] top-0 w-[80px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph1 />
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[4.09px] w-[79px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[39.92px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">Out Time</p>
    </div>
  );
}

function HeaderCell2() {
  return (
    <div className="absolute h-[24.688px] left-[120px] top-0 w-[80px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph2 />
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[4.09px] w-[55px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[27.55px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">OT</p>
    </div>
  );
}

function HeaderCell3() {
  return (
    <div className="absolute h-[24.688px] left-[200px] top-0 w-[56px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph3 />
    </div>
  );
}

function Paragraph4() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[4.09px] w-[376.688px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[188.45px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">Remarks</p>
    </div>
  );
}

function HeaderCell4() {
  return (
    <div className="absolute h-[24.688px] left-[256px] top-0 w-[377.688px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph4 />
    </div>
  );
}

function Paragraph5() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[4.09px] w-[95px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[47.67px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">Signature</p>
    </div>
  );
}

function HeaderCell5() {
  return (
    <div className="absolute h-[24.688px] left-[633.69px] top-0 w-[96px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph5 />
    </div>
  );
}

function TableRow() {
  return (
    <div className="absolute bg-gray-200 h-[24.688px] left-0 top-0 w-[729.688px]" data-name="Table Row">
      <HeaderCell />
      <HeaderCell1 />
      <HeaderCell2 />
      <HeaderCell3 />
      <HeaderCell4 />
      <HeaderCell5 />
    </div>
  );
}

function TableHeader() {
  return (
    <div className="absolute h-[24.688px] left-[0.5px] top-[0.5px] w-[729.688px]" data-name="Table Header">
      <TableRow />
    </div>
  );
}

function Paragraph6() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.75px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">1</p>
    </div>
  );
}

function TableCell() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph6 />
    </div>
  );
}

function Text() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell1() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text />
    </div>
  );
}

function Text1() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell2() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text1 />
    </div>
  );
}

function Text2() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell3() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text2 />
    </div>
  );
}

function Text3() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell4() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text3 />
    </div>
  );
}

function DailySignatureCell() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell5() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell />
    </div>
  );
}

function TableRow1() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[729.688px]" data-name="Table Row">
      <TableCell />
      <TableCell1 />
      <TableCell2 />
      <TableCell3 />
      <TableCell4 />
      <TableCell5 />
    </div>
  );
}

function Paragraph7() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.75px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">2</p>
    </div>
  );
}

function TableCell6() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph7 />
    </div>
  );
}

function Text4() {
  return (
    <div className="absolute box-border content-stretch flex h-[17px] items-center justify-center left-[0.5px] px-[4px] py-0 top-[0.5px] w-[79px]" data-name="Text">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-black text-nowrap whitespace-pre">6.23am</p>
    </div>
  );
}

function TableCell7() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text4 />
    </div>
  );
}

function Text5() {
  return (
    <div className="absolute box-border content-stretch flex h-[17px] items-center justify-center left-[0.5px] px-[4px] py-0 top-[0.5px] w-[79px]" data-name="Text">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-black text-nowrap whitespace-pre">5.20pm</p>
    </div>
  );
}

function TableCell8() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text5 />
    </div>
  );
}

function Text6() {
  return (
    <div className="absolute box-border content-stretch flex h-[17px] items-center justify-center left-[0.5px] px-[4px] py-0 top-[0.5px] w-[55px]" data-name="Text">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-black text-nowrap whitespace-pre">2.5</p>
    </div>
  );
}

function TableCell9() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text6 />
    </div>
  );
}

function Text7() {
  return (
    <div className="absolute box-border content-stretch flex h-[17px] items-center left-[0.5px] px-[4px] py-0 top-[0.5px] w-[376.688px]" data-name="Text">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-black text-nowrap whitespace-pre">Not sure</p>
    </div>
  );
}

function TableCell10() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text7 />
    </div>
  );
}

function DailySignatureCell1() {
  return (
    <div className="absolute h-[15.984px] left-[33.13px] top-px w-[29.75px]" data-name="DailySignatureCell">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-contain pointer-events-none size-full" src={imgDailySignatureCell} />
    </div>
  );
}

function TableCell11() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell1 />
    </div>
  );
}

function TableRow2() {
  return (
    <div className="absolute h-[18px] left-0 top-[18px] w-[729.688px]" data-name="Table Row">
      <TableCell6 />
      <TableCell7 />
      <TableCell8 />
      <TableCell9 />
      <TableCell10 />
      <TableCell11 />
    </div>
  );
}

function Paragraph8() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.75px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">3</p>
    </div>
  );
}

function TableCell12() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph8 />
    </div>
  );
}

function Text8() {
  return (
    <div className="absolute box-border content-stretch flex h-[17px] items-center justify-center left-[0.5px] px-[4px] py-0 top-[0.5px] w-[79px]" data-name="Text">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-black text-nowrap whitespace-pre">8.25am</p>
    </div>
  );
}

function TableCell13() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text8 />
    </div>
  );
}

function Text9() {
  return (
    <div className="absolute box-border content-stretch flex h-[17px] items-center justify-center left-[0.5px] px-[4px] py-0 top-[0.5px] w-[79px]" data-name="Text">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-black text-nowrap whitespace-pre">5.45pm</p>
    </div>
  );
}

function TableCell14() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text9 />
    </div>
  );
}

function Text10() {
  return (
    <div className="absolute box-border content-stretch flex h-[17px] items-center justify-center left-[0.5px] px-[4px] py-0 top-[0.5px] w-[55px]" data-name="Text">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-black text-nowrap whitespace-pre">1</p>
    </div>
  );
}

function TableCell15() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text10 />
    </div>
  );
}

function Text11() {
  return (
    <div className="absolute box-border content-stretch flex h-[17px] items-center left-[0.5px] px-[4px] py-0 top-[0.5px] w-[376.688px]" data-name="Text">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-black text-nowrap whitespace-pre">ok</p>
    </div>
  );
}

function TableCell16() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text11 />
    </div>
  );
}

function DailySignatureCell2() {
  return (
    <div className="absolute h-[15.984px] left-[33.13px] top-px w-[29.75px]" data-name="DailySignatureCell">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-contain pointer-events-none size-full" src={imgDailySignatureCell} />
    </div>
  );
}

function TableCell17() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell2 />
    </div>
  );
}

function TableRow3() {
  return (
    <div className="absolute h-[18px] left-0 top-[36px] w-[729.688px]" data-name="Table Row">
      <TableCell12 />
      <TableCell13 />
      <TableCell14 />
      <TableCell15 />
      <TableCell16 />
      <TableCell17 />
    </div>
  );
}

function Paragraph9() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.75px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">4</p>
    </div>
  );
}

function TableCell18() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph9 />
    </div>
  );
}

function Text12() {
  return (
    <div className="absolute box-border content-stretch flex h-[17px] items-center justify-center left-[0.5px] px-[4px] py-0 top-[0.5px] w-[79px]" data-name="Text">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-black text-nowrap whitespace-pre">5asd</p>
    </div>
  );
}

function TableCell19() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text12 />
    </div>
  );
}

function Text13() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell20() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text13 />
    </div>
  );
}

function Text14() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell21() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text14 />
    </div>
  );
}

function Text15() {
  return (
    <div className="absolute box-border content-stretch flex h-[17px] items-center left-[0.5px] px-[4px] py-0 top-[0.5px] w-[376.688px]" data-name="Text">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-black text-nowrap whitespace-pre">shob dhorner format niteche</p>
    </div>
  );
}

function TableCell22() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text15 />
    </div>
  );
}

function DailySignatureCell3() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell23() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell3 />
    </div>
  );
}

function TableRow4() {
  return (
    <div className="absolute h-[18px] left-0 top-[54px] w-[729.688px]" data-name="Table Row">
      <TableCell18 />
      <TableCell19 />
      <TableCell20 />
      <TableCell21 />
      <TableCell22 />
      <TableCell23 />
    </div>
  );
}

function Paragraph10() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.75px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">5</p>
    </div>
  );
}

function TableCell24() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph10 />
    </div>
  );
}

function Text16() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell25() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text16 />
    </div>
  );
}

function Text17() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell26() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text17 />
    </div>
  );
}

function Text18() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell27() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text18 />
    </div>
  );
}

function Text19() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell28() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text19 />
    </div>
  );
}

function DailySignatureCell4() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell29() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell4 />
    </div>
  );
}

function TableRow5() {
  return (
    <div className="absolute h-[18px] left-0 top-[72px] w-[729.688px]" data-name="Table Row">
      <TableCell24 />
      <TableCell25 />
      <TableCell26 />
      <TableCell27 />
      <TableCell28 />
      <TableCell29 />
    </div>
  );
}

function Paragraph11() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.75px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">6</p>
    </div>
  );
}

function TableCell30() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph11 />
    </div>
  );
}

function Text20() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell31() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text20 />
    </div>
  );
}

function Text21() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell32() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text21 />
    </div>
  );
}

function Text22() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell33() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text22 />
    </div>
  );
}

function Text23() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell34() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text23 />
    </div>
  );
}

function DailySignatureCell5() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell35() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell5 />
    </div>
  );
}

function TableRow6() {
  return (
    <div className="absolute h-[18px] left-0 top-[90px] w-[729.688px]" data-name="Table Row">
      <TableCell30 />
      <TableCell31 />
      <TableCell32 />
      <TableCell33 />
      <TableCell34 />
      <TableCell35 />
    </div>
  );
}

function Paragraph12() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.75px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">7</p>
    </div>
  );
}

function TableCell36() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph12 />
    </div>
  );
}

function Paragraph13() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[593.188px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-[296.16px] not-italic text-[11px] text-black text-center text-nowrap top-0 translate-x-[-50%] whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableCell37() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[593.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph13 />
    </div>
  );
}

function DailySignatureCell6() {
  return <div className="absolute h-[17px] left-0 top-[0.5px] w-[95.5px]" data-name="DailySignatureCell" />;
}

function TableCell38() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell6 />
    </div>
  );
}

function TableRow7() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-[108px] w-[729.688px]" data-name="Table Row">
      <TableCell36 />
      <TableCell37 />
      <TableCell38 />
    </div>
  );
}

function Paragraph14() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.75px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">8</p>
    </div>
  );
}

function TableCell39() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph14 />
    </div>
  );
}

function Paragraph15() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[593.188px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-[296.16px] not-italic text-[11px] text-black text-center text-nowrap top-0 translate-x-[-50%] whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableCell40() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[593.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph15 />
    </div>
  );
}

function DailySignatureCell7() {
  return <div className="absolute h-[17px] left-0 top-[0.5px] w-[95.5px]" data-name="DailySignatureCell" />;
}

function TableCell41() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell7 />
    </div>
  );
}

function TableRow8() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-[126px] w-[729.688px]" data-name="Table Row">
      <TableCell39 />
      <TableCell40 />
      <TableCell41 />
    </div>
  );
}

function Paragraph16() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.75px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">9</p>
    </div>
  );
}

function TableCell42() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph16 />
    </div>
  );
}

function Text24() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell43() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text24 />
    </div>
  );
}

function Text25() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell44() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text25 />
    </div>
  );
}

function Text26() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell45() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text26 />
    </div>
  );
}

function Text27() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell46() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text27 />
    </div>
  );
}

function DailySignatureCell8() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell47() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell8 />
    </div>
  );
}

function TableRow9() {
  return (
    <div className="absolute h-[18px] left-0 top-[144px] w-[729.688px]" data-name="Table Row">
      <TableCell42 />
      <TableCell43 />
      <TableCell44 />
      <TableCell45 />
      <TableCell46 />
      <TableCell47 />
    </div>
  );
}

function Paragraph17() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">10</p>
    </div>
  );
}

function TableCell48() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph17 />
    </div>
  );
}

function Text28() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell49() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text28 />
    </div>
  );
}

function Text29() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell50() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text29 />
    </div>
  );
}

function Text30() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell51() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text30 />
    </div>
  );
}

function Text31() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell52() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text31 />
    </div>
  );
}

function DailySignatureCell9() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell53() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell9 />
    </div>
  );
}

function TableRow10() {
  return (
    <div className="absolute h-[18px] left-0 top-[162px] w-[729.688px]" data-name="Table Row">
      <TableCell48 />
      <TableCell49 />
      <TableCell50 />
      <TableCell51 />
      <TableCell52 />
      <TableCell53 />
    </div>
  );
}

function Paragraph18() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.8px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">11</p>
    </div>
  );
}

function TableCell54() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph18 />
    </div>
  );
}

function Text32() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell55() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text32 />
    </div>
  );
}

function Text33() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell56() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text33 />
    </div>
  );
}

function Text34() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell57() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text34 />
    </div>
  );
}

function Text35() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell58() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text35 />
    </div>
  );
}

function DailySignatureCell10() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell59() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell10 />
    </div>
  );
}

function TableRow11() {
  return (
    <div className="absolute h-[18px] left-0 top-[180px] w-[729.688px]" data-name="Table Row">
      <TableCell54 />
      <TableCell55 />
      <TableCell56 />
      <TableCell57 />
      <TableCell58 />
      <TableCell59 />
    </div>
  );
}

function Paragraph19() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">12</p>
    </div>
  );
}

function TableCell60() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph19 />
    </div>
  );
}

function Text36() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell61() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text36 />
    </div>
  );
}

function Text37() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell62() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text37 />
    </div>
  );
}

function Text38() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell63() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text38 />
    </div>
  );
}

function Text39() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell64() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text39 />
    </div>
  );
}

function DailySignatureCell11() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell65() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell11 />
    </div>
  );
}

function TableRow12() {
  return (
    <div className="absolute h-[18px] left-0 top-[198px] w-[729.688px]" data-name="Table Row">
      <TableCell60 />
      <TableCell61 />
      <TableCell62 />
      <TableCell63 />
      <TableCell64 />
      <TableCell65 />
    </div>
  );
}

function Paragraph20() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">13</p>
    </div>
  );
}

function TableCell66() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph20 />
    </div>
  );
}

function Text40() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell67() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text40 />
    </div>
  );
}

function Text41() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell68() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text41 />
    </div>
  );
}

function Text42() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell69() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text42 />
    </div>
  );
}

function Text43() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell70() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text43 />
    </div>
  );
}

function DailySignatureCell12() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell71() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell12 />
    </div>
  );
}

function TableRow13() {
  return (
    <div className="absolute h-[18px] left-0 top-[216px] w-[729.688px]" data-name="Table Row">
      <TableCell66 />
      <TableCell67 />
      <TableCell68 />
      <TableCell69 />
      <TableCell70 />
      <TableCell71 />
    </div>
  );
}

function Paragraph21() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">14</p>
    </div>
  );
}

function TableCell72() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph21 />
    </div>
  );
}

function Paragraph22() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[593.188px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-[296.16px] not-italic text-[11px] text-black text-center text-nowrap top-0 translate-x-[-50%] whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableCell73() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[593.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph22 />
    </div>
  );
}

function DailySignatureCell13() {
  return <div className="absolute h-[17px] left-0 top-[0.5px] w-[95.5px]" data-name="DailySignatureCell" />;
}

function TableCell74() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell13 />
    </div>
  );
}

function TableRow14() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-[234px] w-[729.688px]" data-name="Table Row">
      <TableCell72 />
      <TableCell73 />
      <TableCell74 />
    </div>
  );
}

function Paragraph23() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">15</p>
    </div>
  );
}

function TableCell75() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph23 />
    </div>
  );
}

function Paragraph24() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[593.188px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-[296.16px] not-italic text-[11px] text-black text-center text-nowrap top-0 translate-x-[-50%] whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableCell76() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[593.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph24 />
    </div>
  );
}

function DailySignatureCell14() {
  return <div className="absolute h-[17px] left-0 top-[0.5px] w-[95.5px]" data-name="DailySignatureCell" />;
}

function TableCell77() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell14 />
    </div>
  );
}

function TableRow15() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-[252px] w-[729.688px]" data-name="Table Row">
      <TableCell75 />
      <TableCell76 />
      <TableCell77 />
    </div>
  );
}

function Paragraph25() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">16</p>
    </div>
  );
}

function TableCell78() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph25 />
    </div>
  );
}

function Text44() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell79() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text44 />
    </div>
  );
}

function Text45() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell80() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text45 />
    </div>
  );
}

function Text46() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell81() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text46 />
    </div>
  );
}

function Text47() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell82() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text47 />
    </div>
  );
}

function DailySignatureCell15() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell83() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell15 />
    </div>
  );
}

function TableRow16() {
  return (
    <div className="absolute h-[18px] left-0 top-[270px] w-[729.688px]" data-name="Table Row">
      <TableCell78 />
      <TableCell79 />
      <TableCell80 />
      <TableCell81 />
      <TableCell82 />
      <TableCell83 />
    </div>
  );
}

function Paragraph26() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">17</p>
    </div>
  );
}

function TableCell84() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph26 />
    </div>
  );
}

function Text48() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell85() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text48 />
    </div>
  );
}

function Text49() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell86() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text49 />
    </div>
  );
}

function Text50() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell87() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text50 />
    </div>
  );
}

function Text51() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell88() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text51 />
    </div>
  );
}

function DailySignatureCell16() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell89() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell16 />
    </div>
  );
}

function TableRow17() {
  return (
    <div className="absolute h-[18px] left-0 top-[288px] w-[729.688px]" data-name="Table Row">
      <TableCell84 />
      <TableCell85 />
      <TableCell86 />
      <TableCell87 />
      <TableCell88 />
      <TableCell89 />
    </div>
  );
}

function Paragraph27() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">18</p>
    </div>
  );
}

function TableCell90() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph27 />
    </div>
  );
}

function Text52() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell91() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text52 />
    </div>
  );
}

function Text53() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell92() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text53 />
    </div>
  );
}

function Text54() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell93() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text54 />
    </div>
  );
}

function Text55() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell94() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text55 />
    </div>
  );
}

function DailySignatureCell17() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell95() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell17 />
    </div>
  );
}

function TableRow18() {
  return (
    <div className="absolute h-[18px] left-0 top-[306px] w-[729.688px]" data-name="Table Row">
      <TableCell90 />
      <TableCell91 />
      <TableCell92 />
      <TableCell93 />
      <TableCell94 />
      <TableCell95 />
    </div>
  );
}

function Paragraph28() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">19</p>
    </div>
  );
}

function TableCell96() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph28 />
    </div>
  );
}

function Text56() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell97() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text56 />
    </div>
  );
}

function Text57() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell98() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text57 />
    </div>
  );
}

function Text58() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell99() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text58 />
    </div>
  );
}

function Text59() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell100() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text59 />
    </div>
  );
}

function DailySignatureCell18() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell101() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell18 />
    </div>
  );
}

function TableRow19() {
  return (
    <div className="absolute h-[18px] left-0 top-[324px] w-[729.688px]" data-name="Table Row">
      <TableCell96 />
      <TableCell97 />
      <TableCell98 />
      <TableCell99 />
      <TableCell100 />
      <TableCell101 />
    </div>
  );
}

function Paragraph29() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">20</p>
    </div>
  );
}

function TableCell102() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph29 />
    </div>
  );
}

function Text60() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell103() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text60 />
    </div>
  );
}

function Text61() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell104() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text61 />
    </div>
  );
}

function Text62() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell105() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text62 />
    </div>
  );
}

function Text63() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell106() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text63 />
    </div>
  );
}

function DailySignatureCell19() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell107() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell19 />
    </div>
  );
}

function TableRow20() {
  return (
    <div className="absolute h-[18px] left-0 top-[342px] w-[729.688px]" data-name="Table Row">
      <TableCell102 />
      <TableCell103 />
      <TableCell104 />
      <TableCell105 />
      <TableCell106 />
      <TableCell107 />
    </div>
  );
}

function Paragraph30() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">21</p>
    </div>
  );
}

function TableCell108() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph30 />
    </div>
  );
}

function Paragraph31() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[593.188px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-[296.16px] not-italic text-[11px] text-black text-center text-nowrap top-0 translate-x-[-50%] whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableCell109() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[593.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph31 />
    </div>
  );
}

function DailySignatureCell20() {
  return <div className="absolute h-[17px] left-0 top-[0.5px] w-[95.5px]" data-name="DailySignatureCell" />;
}

function TableCell110() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell20 />
    </div>
  );
}

function TableRow21() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-[360px] w-[729.688px]" data-name="Table Row">
      <TableCell108 />
      <TableCell109 />
      <TableCell110 />
    </div>
  );
}

function Paragraph32() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">22</p>
    </div>
  );
}

function TableCell111() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph32 />
    </div>
  );
}

function Paragraph33() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[593.188px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-[296.16px] not-italic text-[11px] text-black text-center text-nowrap top-0 translate-x-[-50%] whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableCell112() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[593.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph33 />
    </div>
  );
}

function DailySignatureCell21() {
  return <div className="absolute h-[17px] left-0 top-[0.5px] w-[95.5px]" data-name="DailySignatureCell" />;
}

function TableCell113() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell21 />
    </div>
  );
}

function TableRow22() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-[378px] w-[729.688px]" data-name="Table Row">
      <TableCell111 />
      <TableCell112 />
      <TableCell113 />
    </div>
  );
}

function Paragraph34() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">23</p>
    </div>
  );
}

function TableCell114() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph34 />
    </div>
  );
}

function Text64() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell115() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text64 />
    </div>
  );
}

function Text65() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell116() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text65 />
    </div>
  );
}

function Text66() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell117() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text66 />
    </div>
  );
}

function Text67() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell118() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text67 />
    </div>
  );
}

function DailySignatureCell22() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell119() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell22 />
    </div>
  );
}

function TableRow23() {
  return (
    <div className="absolute h-[18px] left-0 top-[396px] w-[729.688px]" data-name="Table Row">
      <TableCell114 />
      <TableCell115 />
      <TableCell116 />
      <TableCell117 />
      <TableCell118 />
      <TableCell119 />
    </div>
  );
}

function Paragraph35() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">24</p>
    </div>
  );
}

function TableCell120() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph35 />
    </div>
  );
}

function Text68() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell121() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text68 />
    </div>
  );
}

function Text69() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell122() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text69 />
    </div>
  );
}

function Text70() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell123() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text70 />
    </div>
  );
}

function Text71() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell124() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text71 />
    </div>
  );
}

function DailySignatureCell23() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell125() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell23 />
    </div>
  );
}

function TableRow24() {
  return (
    <div className="absolute h-[18px] left-0 top-[414px] w-[729.688px]" data-name="Table Row">
      <TableCell120 />
      <TableCell121 />
      <TableCell122 />
      <TableCell123 />
      <TableCell124 />
      <TableCell125 />
    </div>
  );
}

function Paragraph36() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">25</p>
    </div>
  );
}

function TableCell126() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph36 />
    </div>
  );
}

function Text72() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell127() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text72 />
    </div>
  );
}

function Text73() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell128() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text73 />
    </div>
  );
}

function Text74() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell129() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text74 />
    </div>
  );
}

function Text75() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell130() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text75 />
    </div>
  );
}

function DailySignatureCell24() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell131() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell24 />
    </div>
  );
}

function TableRow25() {
  return (
    <div className="absolute h-[18px] left-0 top-[432px] w-[729.688px]" data-name="Table Row">
      <TableCell126 />
      <TableCell127 />
      <TableCell128 />
      <TableCell129 />
      <TableCell130 />
      <TableCell131 />
    </div>
  );
}

function Paragraph37() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">26</p>
    </div>
  );
}

function TableCell132() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph37 />
    </div>
  );
}

function Text76() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell133() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text76 />
    </div>
  );
}

function Text77() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell134() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text77 />
    </div>
  );
}

function Text78() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell135() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text78 />
    </div>
  );
}

function Text79() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell136() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text79 />
    </div>
  );
}

function DailySignatureCell25() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell137() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell25 />
    </div>
  );
}

function TableRow26() {
  return (
    <div className="absolute h-[18px] left-0 top-[450px] w-[729.688px]" data-name="Table Row">
      <TableCell132 />
      <TableCell133 />
      <TableCell134 />
      <TableCell135 />
      <TableCell136 />
      <TableCell137 />
    </div>
  );
}

function Paragraph38() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">27</p>
    </div>
  );
}

function TableCell138() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph38 />
    </div>
  );
}

function Text80() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell139() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text80 />
    </div>
  );
}

function Text81() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell140() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text81 />
    </div>
  );
}

function Text82() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell141() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text82 />
    </div>
  );
}

function Text83() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell142() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text83 />
    </div>
  );
}

function DailySignatureCell26() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell143() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell26 />
    </div>
  );
}

function TableRow27() {
  return (
    <div className="absolute h-[18px] left-0 top-[468px] w-[729.688px]" data-name="Table Row">
      <TableCell138 />
      <TableCell139 />
      <TableCell140 />
      <TableCell141 />
      <TableCell142 />
      <TableCell143 />
    </div>
  );
}

function Paragraph39() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">28</p>
    </div>
  );
}

function TableCell144() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph39 />
    </div>
  );
}

function Paragraph40() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[593.188px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-[296.16px] not-italic text-[11px] text-black text-center text-nowrap top-0 translate-x-[-50%] whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableCell145() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[593.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph40 />
    </div>
  );
}

function DailySignatureCell27() {
  return <div className="absolute h-[17px] left-0 top-[0.5px] w-[95.5px]" data-name="DailySignatureCell" />;
}

function TableCell146() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell27 />
    </div>
  );
}

function TableRow28() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-[486px] w-[729.688px]" data-name="Table Row">
      <TableCell144 />
      <TableCell145 />
      <TableCell146 />
    </div>
  );
}

function Paragraph41() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">29</p>
    </div>
  );
}

function TableCell147() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph41 />
    </div>
  );
}

function Text84() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell148() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text84 />
    </div>
  );
}

function Text85() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell149() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text85 />
    </div>
  );
}

function Text86() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell150() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text86 />
    </div>
  );
}

function Text87() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell151() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text87 />
    </div>
  );
}

function DailySignatureCell28() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell152() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell28 />
    </div>
  );
}

function TableRow29() {
  return (
    <div className="absolute h-[18px] left-0 top-[504px] w-[729.688px]" data-name="Table Row">
      <TableCell147 />
      <TableCell148 />
      <TableCell149 />
      <TableCell150 />
      <TableCell151 />
      <TableCell152 />
    </div>
  );
}

function Paragraph42() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[0.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">30</p>
    </div>
  );
}

function TableCell153() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph42 />
    </div>
  );
}

function Text88() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell154() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text88 />
    </div>
  );
}

function Text89() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[79px]" data-name="Text" />;
}

function TableCell155() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text89 />
    </div>
  );
}

function Text90() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[55px]" data-name="Text" />;
}

function TableCell156() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text90 />
    </div>
  );
}

function Text91() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[376.688px]" data-name="Text" />;
}

function TableCell157() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[377.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text91 />
    </div>
  );
}

function DailySignatureCell29() {
  return <div className="absolute h-[17px] left-[0.5px] top-[0.5px] w-[95px]" data-name="DailySignatureCell" />;
}

function TableCell158() {
  return (
    <div className="absolute h-[18px] left-[633.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <DailySignatureCell29 />
    </div>
  );
}

function TableRow30() {
  return (
    <div className="absolute h-[18px] left-0 top-[522px] w-[729.688px]" data-name="Table Row">
      <TableCell153 />
      <TableCell154 />
      <TableCell155 />
      <TableCell156 />
      <TableCell157 />
      <TableCell158 />
    </div>
  );
}

function TableBody() {
  return (
    <div className="absolute h-[540px] left-[0.5px] top-[25.19px] w-[729.688px]" data-name="Table Body">
      <TableRow1 />
      <TableRow2 />
      <TableRow3 />
      <TableRow4 />
      <TableRow5 />
      <TableRow6 />
      <TableRow7 />
      <TableRow8 />
      <TableRow9 />
      <TableRow10 />
      <TableRow11 />
      <TableRow12 />
      <TableRow13 />
      <TableRow14 />
      <TableRow15 />
      <TableRow16 />
      <TableRow17 />
      <TableRow18 />
      <TableRow19 />
      <TableRow20 />
      <TableRow21 />
      <TableRow22 />
      <TableRow23 />
      <TableRow24 />
      <TableRow25 />
      <TableRow26 />
      <TableRow27 />
      <TableRow28 />
      <TableRow29 />
      <TableRow30 />
    </div>
  );
}

function Table() {
  return (
    <div className="absolute h-[565.688px] left-[32px] top-[204.13px] w-[730.688px]" data-name="Table">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <ColumnGroup />
      <TableHeader />
      <TableBody />
    </div>
  );
}

function Paragraph43() {
  return (
    <div className="absolute h-[16px] left-[32px] top-[793.81px] w-[697.688px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16px] left-0 not-italic text-[12px] text-black text-nowrap top-px whitespace-pre">H.R Comments :</p>
    </div>
  );
}

function Column6() {
  return <div className="absolute h-[194.688px] left-0 top-0 w-[40px]" data-name="Column" />;
}

function Column7() {
  return <div className="absolute h-[194.688px] left-[40px] top-0 w-[192px]" data-name="Column" />;
}

function Column8() {
  return <div className="absolute h-[194.688px] left-[232px] top-0 w-[160px]" data-name="Column" />;
}

function Column9() {
  return <div className="absolute h-[194.688px] left-[392px] top-0 w-[337.688px]" data-name="Column" />;
}

function ColumnGroup1() {
  return (
    <div className="absolute h-[194.688px] left-[0.5px] top-[0.5px] w-[729.688px]" data-name="Column Group">
      <Column6 />
      <Column7 />
      <Column8 />
      <Column9 />
    </div>
  );
}

function Paragraph44() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[2.09px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.53px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">Sl.</p>
    </div>
  );
}

function HeaderCell6() {
  return (
    <div className="absolute h-[20.688px] left-0 top-0 w-[40px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph44 />
    </div>
  );
}

function Paragraph45() {
  return (
    <div className="absolute h-[16.5px] left-[9px] top-[2.09px] w-[182.5px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-0 not-italic text-[11px] text-black text-nowrap top-[2px] whitespace-pre">Particulars</p>
    </div>
  );
}

function HeaderCell7() {
  return (
    <div className="absolute h-[20.688px] left-[40px] top-0 w-[192px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph45 />
    </div>
  );
}

function Paragraph46() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[2.09px] w-[159px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[79.59px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">Day/s, Hour, Minutes, Eligibility</p>
    </div>
  );
}

function HeaderCell8() {
  return (
    <div className="absolute h-[20.688px] left-[232px] top-0 w-[160px]" data-name="Header Cell">
      <div className="h-[20.688px] overflow-clip relative rounded-[inherit] w-[160px]">
        <Paragraph46 />
      </div>
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Paragraph47() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[2.09px] w-[336.688px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[168.45px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">Remarks</p>
    </div>
  );
}

function HeaderCell9() {
  return (
    <div className="absolute h-[20.688px] left-[392px] top-0 w-[337.688px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph47 />
    </div>
  );
}

function TableRow31() {
  return (
    <div className="absolute h-[20.688px] left-0 top-0 w-[729.688px]" data-name="Table Row">
      <HeaderCell6 />
      <HeaderCell7 />
      <HeaderCell8 />
      <HeaderCell9 />
    </div>
  );
}

function TableHeader1() {
  return (
    <div className="absolute h-[20.688px] left-[0.5px] top-[0.5px] w-[729.688px]" data-name="Table Header">
      <TableRow31 />
    </div>
  );
}

function Paragraph48() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[1.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">01</p>
    </div>
  );
}

function TableCell159() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph48 />
    </div>
  );
}

function Paragraph49() {
  return (
    <div className="absolute h-[16.5px] left-[9px] top-[1.75px] w-[182.5px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-0 not-italic text-[11px] text-black text-nowrap top-0 whitespace-pre">Sick Leave</p>
    </div>
  );
}

function TableCell160() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph49 />
    </div>
  );
}

function Text92() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[159px]" data-name="Text" />;
}

function TableCell161() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text92 />
    </div>
  );
}

function Text93() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[336.688px]" data-name="Text" />;
}

function TableCell162() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[337.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Text93 />
    </div>
  );
}

function TableRow32() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[729.688px]" data-name="Table Row">
      <TableCell159 />
      <TableCell160 />
      <TableCell161 />
      <TableCell162 />
    </div>
  );
}

function Paragraph50() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[1.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">02</p>
    </div>
  );
}

function TableCell163() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph50 />
    </div>
  );
}

function Paragraph51() {
  return (
    <div className="absolute h-[16.5px] left-[9px] top-[1.75px] w-[182.5px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-0 not-italic text-[11px] text-black text-nowrap top-0 whitespace-pre">Casual Leave</p>
    </div>
  );
}

function TableCell164() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph51 />
    </div>
  );
}

function Text94() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[159px]" data-name="Text" />;
}

function TableCell165() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text94 />
    </div>
  );
}

function Text95() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[336.688px]" data-name="Text" />;
}

function TableCell166() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[337.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Text95 />
    </div>
  );
}

function TableRow33() {
  return (
    <div className="absolute h-[20px] left-0 top-[20px] w-[729.688px]" data-name="Table Row">
      <TableCell163 />
      <TableCell164 />
      <TableCell165 />
      <TableCell166 />
    </div>
  );
}

function Paragraph52() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[1.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">03</p>
    </div>
  );
}

function TableCell167() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph52 />
    </div>
  );
}

function Paragraph53() {
  return (
    <div className="absolute h-[16.5px] left-[9px] top-[1.75px] w-[182.5px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-0 not-italic text-[11px] text-black text-nowrap top-0 whitespace-pre">Earn Leave</p>
    </div>
  );
}

function TableCell168() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph53 />
    </div>
  );
}

function Text96() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[159px]" data-name="Text" />;
}

function TableCell169() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text96 />
    </div>
  );
}

function Text97() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[336.688px]" data-name="Text" />;
}

function TableCell170() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[337.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Text97 />
    </div>
  );
}

function TableRow34() {
  return (
    <div className="absolute h-[20px] left-0 top-[40px] w-[729.688px]" data-name="Table Row">
      <TableCell167 />
      <TableCell168 />
      <TableCell169 />
      <TableCell170 />
    </div>
  );
}

function Paragraph54() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[1.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">04</p>
    </div>
  );
}

function TableCell171() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph54 />
    </div>
  );
}

function Paragraph55() {
  return (
    <div className="absolute h-[16.5px] left-[9px] top-[1.75px] w-[182.5px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-0 not-italic text-[11px] text-black text-nowrap top-0 whitespace-pre">Late</p>
    </div>
  );
}

function TableCell172() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph55 />
    </div>
  );
}

function Text98() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[159px]" data-name="Text" />;
}

function TableCell173() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text98 />
    </div>
  );
}

function Text99() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[336.688px]" data-name="Text" />;
}

function TableCell174() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[337.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Text99 />
    </div>
  );
}

function TableRow35() {
  return (
    <div className="absolute h-[20px] left-0 top-[60px] w-[729.688px]" data-name="Table Row">
      <TableCell171 />
      <TableCell172 />
      <TableCell173 />
      <TableCell174 />
    </div>
  );
}

function Paragraph56() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[1.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">05</p>
    </div>
  );
}

function TableCell175() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph56 />
    </div>
  );
}

function Paragraph57() {
  return (
    <div className="absolute h-[16.5px] left-[9px] top-[1.75px] w-[182.5px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-0 not-italic text-[11px] text-black text-nowrap top-0 whitespace-pre">Other Leave</p>
    </div>
  );
}

function TableCell176() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph57 />
    </div>
  );
}

function Text100() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[159px]" data-name="Text" />;
}

function TableCell177() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text100 />
    </div>
  );
}

function Text101() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[336.688px]" data-name="Text" />;
}

function TableCell178() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[337.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Text101 />
    </div>
  );
}

function TableRow36() {
  return (
    <div className="absolute h-[20px] left-0 top-[80px] w-[729.688px]" data-name="Table Row">
      <TableCell175 />
      <TableCell176 />
      <TableCell177 />
      <TableCell178 />
    </div>
  );
}

function Paragraph58() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[1.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">06</p>
    </div>
  );
}

function TableCell179() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph58 />
    </div>
  );
}

function Paragraph59() {
  return (
    <div className="absolute h-[16.5px] left-[9px] top-[1.75px] w-[182.5px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-0 not-italic text-[11px] text-black text-nowrap top-0 whitespace-pre">Eligible for Attendance Bonus</p>
    </div>
  );
}

function TableCell180() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph59 />
    </div>
  );
}

function Text102() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[159px]" data-name="Text" />;
}

function TableCell181() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text102 />
    </div>
  );
}

function Text103() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[336.688px]" data-name="Text" />;
}

function TableCell182() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[337.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Text103 />
    </div>
  );
}

function TableRow37() {
  return (
    <div className="absolute h-[20px] left-0 top-[100px] w-[729.688px]" data-name="Table Row">
      <TableCell179 />
      <TableCell180 />
      <TableCell181 />
      <TableCell182 />
    </div>
  );
}

function Paragraph60() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[8.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">07</p>
    </div>
  );
}

function TableCell183() {
  return (
    <div className="absolute h-[34px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph60 />
    </div>
  );
}

function Paragraph61() {
  return (
    <div className="absolute h-[33px] left-[9px] top-[0.5px] w-[182.5px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-0 not-italic text-[11px] text-black top-0 w-[159px]">Last Working day OT of Previous Month</p>
    </div>
  );
}

function TableCell184() {
  return (
    <div className="absolute h-[34px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph61 />
    </div>
  );
}

function Text104() {
  return <div className="absolute h-0 left-[0.5px] top-[17px] w-[159px]" data-name="Text" />;
}

function TableCell185() {
  return (
    <div className="absolute h-[34px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text104 />
    </div>
  );
}

function Text105() {
  return <div className="absolute h-0 left-[0.5px] top-[17px] w-[336.688px]" data-name="Text" />;
}

function TableCell186() {
  return (
    <div className="absolute h-[34px] left-[392px] top-0 w-[337.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Text105 />
    </div>
  );
}

function TableRow38() {
  return (
    <div className="absolute h-[34px] left-0 top-[120px] w-[729.688px]" data-name="Table Row">
      <TableCell183 />
      <TableCell184 />
      <TableCell185 />
      <TableCell186 />
    </div>
  );
}

function Paragraph62() {
  return (
    <div className="absolute h-[16.5px] left-[0.5px] top-[1.75px] w-[39px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16.5px] left-[19.5px] not-italic text-[11px] text-black text-center text-nowrap top-[2px] translate-x-[-50%] whitespace-pre">08</p>
    </div>
  );
}

function TableCell187() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph62 />
    </div>
  );
}

function Paragraph63() {
  return (
    <div className="absolute h-[16.5px] left-[9px] top-[1.75px] w-[182.5px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[16.5px] left-0 not-italic text-[11px] text-black text-nowrap top-0 whitespace-pre">Total OT</p>
    </div>
  );
}

function TableCell188() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Paragraph63 />
    </div>
  );
}

function Text106() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[159px]" data-name="Text" />;
}

function TableCell189() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <Text106 />
    </div>
  );
}

function Text107() {
  return <div className="absolute h-0 left-[0.5px] top-[10px] w-[336.688px]" data-name="Text" />;
}

function TableCell190() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[337.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-black border-solid inset-0 pointer-events-none" />
      <Text107 />
    </div>
  );
}

function TableRow39() {
  return (
    <div className="absolute h-[20px] left-0 top-[154px] w-[729.688px]" data-name="Table Row">
      <TableCell187 />
      <TableCell188 />
      <TableCell189 />
      <TableCell190 />
    </div>
  );
}

function TableBody1() {
  return (
    <div className="absolute h-[174px] left-[0.5px] top-[21.19px] w-[729.688px]" data-name="Table Body">
      <TableRow32 />
      <TableRow33 />
      <TableRow34 />
      <TableRow35 />
      <TableRow36 />
      <TableRow37 />
      <TableRow38 />
      <TableRow39 />
    </div>
  );
}

function Table1() {
  return (
    <div className="absolute h-[195.688px] left-[32px] top-[813.81px] w-[730.688px]" data-name="Table">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <ColumnGroup1 />
      <TableHeader1 />
      <TableBody1 />
    </div>
  );
}

function Paragraph64() {
  return (
    <div className="absolute h-[18px] left-[67.16px] top-[71px] w-[65.672px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[18px] left-0 not-italic text-[12px] text-black text-nowrap top-[2px] whitespace-pre">Checked By:</p>
    </div>
  );
}

function Paragraph65() {
  return (
    <div className="absolute h-[15px] left-[56.61px] top-[89px] w-[86.781px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15px] left-0 not-italic text-[10px] text-black top-0 w-[87px]">Kuno San - Director</p>
    </div>
  );
}

function ImageKunoSan() {
  return (
    <div className="absolute h-[59.984px] left-[44.2px] top-[0.02px] w-[111.578px]" data-name="Image (Kuno San)">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-contain pointer-events-none size-full" src={imgDailySignatureCell} />
    </div>
  );
}

function Container() {
  return (
    <div className="absolute h-px left-0 top-[65px] w-[200px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[1px_0px_0px] border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Container1() {
  return (
    <div className="absolute h-[104px] left-[10px] top-0 w-[200px]" data-name="Container">
      <Paragraph64 />
      <Paragraph65 />
      <ImageKunoSan />
      <Container />
    </div>
  );
}

function Paragraph66() {
  return (
    <div className="absolute h-[18px] left-[64.59px] top-[71px] w-[70.797px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[18px] left-0 not-italic text-[12px] text-black text-nowrap top-[2px] whitespace-pre">Approved by:</p>
    </div>
  );
}

function Paragraph67() {
  return (
    <div className="absolute h-[15px] left-[56.61px] top-[89px] w-[86.781px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15px] left-0 not-italic text-[10px] text-black top-0 w-[87px]">Kuno San - Director</p>
    </div>
  );
}

function ImageKunoSan1() {
  return (
    <div className="absolute h-[59.984px] left-[44.2px] top-[0.02px] w-[111.578px]" data-name="Image (Kuno San)">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-contain pointer-events-none size-full" src={imgDailySignatureCell} />
    </div>
  );
}

function Container2() {
  return (
    <div className="absolute h-px left-0 top-[65px] w-[200px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[1px_0px_0px] border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Container3() {
  return (
    <div className="absolute h-[104px] left-[487.69px] top-0 w-[200px]" data-name="Container">
      <Paragraph66 />
      <Paragraph67 />
      <ImageKunoSan1 />
      <Container2 />
    </div>
  );
}

function Container4() {
  return (
    <div className="absolute h-[144px] left-[32px] top-[1073.5px] w-[697.688px]" data-name="Container">
      <Container1 />
      <Container3 />
    </div>
  );
}

function Paragraph68() {
  return (
    <div className="absolute h-[40px] left-0 top-[12px] w-[84px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[40px] left-0 not-italic text-[#99a1af] text-[24px] text-nowrap top-px tracking-[-1.8px] whitespace-pre">Timesheet</p>
    </div>
  );
}

function ImageTcf() {
  return (
    <div className="absolute h-[64px] left-[562px] top-0 w-[167.172px]" data-name="Image (TCF)">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-contain pointer-events-none size-full" src={imgImageTcf} />
    </div>
  );
}

function Container5() {
  return (
    <div className="absolute h-[72px] left-[32px] top-[32px] w-[697.688px]" data-name="Container">
      <Paragraph68 />
      <ImageTcf />
    </div>
  );
}

function Paragraph69() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[36.828px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[36.828px]">
        <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[19.5px] left-0 not-italic text-[13px] text-black text-nowrap top-[2px] whitespace-pre">Name:</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="bg-gray-50 h-[24.563px] relative shrink-0 w-[96px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[1px_0px_1px_1px] border-black border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[24.563px] items-center pl-[10px] pr-0 py-px relative w-[96px]">
        <Paragraph69 />
      </div>
    </div>
  );
}

function Text108() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[72.328px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[72.328px]">
        <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[19.5px] left-0 not-italic text-[13px] text-black text-nowrap top-[2px] whitespace-pre">Amir Hamza</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="basis-0 grow h-[24.563px] min-h-px min-w-px relative shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[24.563px] items-center pl-[9px] pr-px py-px relative w-full">
          <Text108 />
        </div>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex h-[24.563px] items-start relative shrink-0 w-full" data-name="Container">
      <Container6 />
      <Container7 />
    </div>
  );
}

function Paragraph70() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[46.594px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[46.594px]">
        <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[19.5px] left-0 not-italic text-[13px] text-black text-nowrap top-[2px] whitespace-pre">EID No:</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="bg-gray-50 h-[23.563px] relative shrink-0 w-[96px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[1px_0px_1px_1px] border-black border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[23.563px] items-center pl-[10px] pr-0 py-px relative w-[96px]">
        <Paragraph70 />
      </div>
    </div>
  );
}

function Text109() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[41.781px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-[41.781px]">
        <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[19.5px] left-0 not-italic text-[13px] text-black text-nowrap top-[2px] whitespace-pre">TCF 02</p>
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="basis-0 grow h-[23.563px] min-h-px min-w-px relative shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[23.563px] items-center pl-[9px] pr-px py-px relative w-full">
          <Text109 />
        </div>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="content-stretch flex h-[23.563px] items-start relative shrink-0 w-full" data-name="Container">
      <Container9 />
      <Container10 />
    </div>
  );
}

function Container12() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[52.125px] items-start left-0 top-0 w-[364.844px]" data-name="Container">
      <Container8 />
      <Container11 />
    </div>
  );
}

function Paragraph71() {
  return (
    <div className="absolute h-[19.5px] left-[509px] top-[29.55px] w-[220px]" data-name="Paragraph">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[19.5px] left-[220.22px] not-italic text-[13px] text-black text-right top-[2px] translate-x-[-100%] w-[188px]">For the Month of November, 2025</p>
    </div>
  );
}

function Container13() {
  return (
    <div className="absolute h-[52.125px] left-[32px] top-[136px] w-[697.688px]" data-name="Container">
      <Container12 />
      <Paragraph71 />
    </div>
  );
}

function Container14() {
  return (
    <div className="h-[1217.5px] relative shrink-0 w-full" data-name="Container">
      <Table />
      <Paragraph43 />
      <Table1 />
      <Container4 />
      <Container5 />
      <Container13 />
    </div>
  );
}

export default function PrintableTimesheet() {
  return (
    <div className="bg-white relative shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] size-full" data-name="PrintableTimesheet">
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col items-start pl-0 pr-[64.313px] py-0 relative size-full">
          <Container14 />
        </div>
      </div>
    </div>
  );
}