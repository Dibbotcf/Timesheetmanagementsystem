import imgImageTcfLogo from "figma:asset/e496b3c659675b1f9399acaf1a235cbe1d77b03e.png";

function Container() {
  return (
    <div className="absolute content-stretch flex h-[60px] items-start left-0 top-[12px] w-[84px]" data-name="Container">
      <p className="font-['Times_New_Roman:Regular',sans-serif] leading-[40px] not-italic relative shrink-0 text-[#99a1af] text-[24px] text-nowrap tracking-[-1.8px] whitespace-pre">Timesheet</p>
    </div>
  );
}

function ImageTcfLogo() {
  return (
    <div className="absolute h-[64px] left-[562.52px] top-0 w-[167.172px]" data-name="Image (TCF Logo)">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-contain pointer-events-none size-full" src={imgImageTcfLogo} />
    </div>
  );
}

function Container1() {
  return (
    <div className="absolute h-[72px] left-[32px] top-[32px] w-[729.688px]" data-name="Container">
      <Container />
      <ImageTcfLogo />
    </div>
  );
}

function Container2() {
  return (
    <div className="bg-gray-50 h-[24.563px] relative shrink-0 w-[96px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[24.563px] relative w-[96px]">
        <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[18.571px] left-[9px] not-italic text-[13px] text-neutral-950 text-nowrap top-[2px] whitespace-pre">Name:</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="basis-0 grow h-[24.563px] min-h-px min-w-px relative shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border-[1px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[24.563px] w-full" />
    </div>
  );
}

function Container4() {
  return (
    <div className="absolute content-stretch flex h-[24.563px] items-start left-0 top-0 w-[364.844px]" data-name="Container">
      <Container2 />
      <Container3 />
    </div>
  );
}

function Container5() {
  return (
    <div className="bg-gray-50 h-[23.563px] relative shrink-0 w-[96px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[23.563px] relative w-[96px]">
        <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[18.571px] left-[9px] not-italic text-[13px] text-neutral-950 text-nowrap top-px whitespace-pre">EID No:</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="basis-0 grow h-[23.563px] min-h-px min-w-px relative shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border-[0px_1px_1px_0px] border-black border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[23.563px] w-full" />
    </div>
  );
}

function Container7() {
  return (
    <div className="absolute content-stretch flex h-[23.563px] items-start left-0 top-[28.56px] w-[243.219px]" data-name="Container">
      <Container5 />
      <Container6 />
    </div>
  );
}

function Container8() {
  return (
    <div className="absolute h-[52.125px] left-0 top-0 w-[364.844px]" data-name="Container">
      <Container4 />
      <Container7 />
    </div>
  );
}

function Container9() {
  return (
    <div className="absolute h-[18.563px] left-[541.91px] top-[29.56px] w-[187.781px]" data-name="Container">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[18.571px] left-0 not-italic text-[13px] text-neutral-950 top-[-1px] w-[188px]">For the Month of November, 2025</p>
    </div>
  );
}

function Container10() {
  return (
    <div className="absolute h-[52.125px] left-[32px] top-[136px] w-[729.688px]" data-name="Container">
      <Container8 />
      <Container9 />
    </div>
  );
}

function HeaderCell() {
  return (
    <div className="absolute h-[24.703px] left-0 top-0 w-[40px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[3.5px] translate-x-[-50%] whitespace-pre">Date</p>
    </div>
  );
}

function HeaderCell1() {
  return (
    <div className="absolute h-[24.703px] left-[40px] top-0 w-[80px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[40.39px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[3.5px] translate-x-[-50%] whitespace-pre">In Time</p>
    </div>
  );
}

function HeaderCell2() {
  return (
    <div className="absolute h-[24.703px] left-[120px] top-0 w-[80px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[40.42px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[3.5px] translate-x-[-50%] whitespace-pre">Out Time</p>
    </div>
  );
}

function HeaderCell3() {
  return (
    <div className="absolute h-[24.703px] left-[200px] top-0 w-[56px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[28.05px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[3.5px] translate-x-[-50%] whitespace-pre">OT</p>
    </div>
  );
}

function HeaderCell4() {
  return (
    <div className="absolute h-[24.703px] left-[256px] top-0 w-[376.688px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[188.45px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[3.5px] translate-x-[-50%] whitespace-pre">Remarks</p>
    </div>
  );
}

function HeaderCell5() {
  return (
    <div className="absolute h-[24.703px] left-[632.69px] top-0 w-[96px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[48.17px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[3.5px] translate-x-[-50%] whitespace-pre">Signature</p>
    </div>
  );
}

function TableRow() {
  return (
    <div className="absolute bg-gray-200 h-[24.703px] left-0 top-0 w-[728.688px]" data-name="Table Row">
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
    <div className="absolute h-[24.703px] left-[0.5px] top-[0.5px] w-[728.688px]" data-name="Table Header">
      <TableRow />
    </div>
  );
}

function TableCell() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.25px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">1</p>
    </div>
  );
}

function TableCell1() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell2() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell3() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell4() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell5() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow1() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[728.688px]" data-name="Table Row">
      <TableCell />
      <TableCell1 />
      <TableCell2 />
      <TableCell3 />
      <TableCell4 />
      <TableCell5 />
    </div>
  );
}

function TableCell6() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.25px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">2</p>
    </div>
  );
}

function TableCell7() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell8() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell9() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell10() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell11() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow2() {
  return (
    <div className="absolute h-[18px] left-0 top-[18px] w-[728.688px]" data-name="Table Row">
      <TableCell6 />
      <TableCell7 />
      <TableCell8 />
      <TableCell9 />
      <TableCell10 />
      <TableCell11 />
    </div>
  );
}

function TableCell12() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.25px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">3</p>
    </div>
  );
}

function TableCell13() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell14() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell15() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell16() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell17() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow3() {
  return (
    <div className="absolute h-[18px] left-0 top-[36px] w-[728.688px]" data-name="Table Row">
      <TableCell12 />
      <TableCell13 />
      <TableCell14 />
      <TableCell15 />
      <TableCell16 />
      <TableCell17 />
    </div>
  );
}

function TableCell18() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.25px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">4</p>
    </div>
  );
}

function TableCell19() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell20() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell21() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell22() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell23() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow4() {
  return (
    <div className="absolute h-[18px] left-0 top-[54px] w-[728.688px]" data-name="Table Row">
      <TableCell18 />
      <TableCell19 />
      <TableCell20 />
      <TableCell21 />
      <TableCell22 />
      <TableCell23 />
    </div>
  );
}

function TableCell24() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.25px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">5</p>
    </div>
  );
}

function TableCell25() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell26() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell27() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell28() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell29() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow5() {
  return (
    <div className="absolute h-[18px] left-0 top-[72px] w-[728.688px]" data-name="Table Row">
      <TableCell24 />
      <TableCell25 />
      <TableCell26 />
      <TableCell27 />
      <TableCell28 />
      <TableCell29 />
    </div>
  );
}

function TableCell30() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.25px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">6</p>
    </div>
  );
}

function TableCell31() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell32() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell33() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell34() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell35() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow6() {
  return (
    <div className="absolute h-[18px] left-0 top-[90px] w-[728.688px]" data-name="Table Row">
      <TableCell30 />
      <TableCell31 />
      <TableCell32 />
      <TableCell33 />
      <TableCell34 />
      <TableCell35 />
    </div>
  );
}

function TableCell36() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.25px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">7</p>
    </div>
  );
}

function TableCell37() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-[40px] top-0 w-[689px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[291px] not-italic text-[11px] text-neutral-950 text-nowrap top-px whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableRow7() {
  return (
    <div className="absolute h-[18px] left-0 top-[108px] w-[728.688px]" data-name="Table Row">
      <TableCell36 />
      <TableCell37 />
    </div>
  );
}

function TableCell38() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.25px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">8</p>
    </div>
  );
}

function TableCell39() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-[40px] top-0 w-[689px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[291px] not-italic text-[11px] text-neutral-950 text-nowrap top-px whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableRow8() {
  return (
    <div className="absolute h-[18px] left-0 top-[126px] w-[728.688px]" data-name="Table Row">
      <TableCell38 />
      <TableCell39 />
    </div>
  );
}

function TableCell40() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.25px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">9</p>
    </div>
  );
}

function TableCell41() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell42() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell43() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell44() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell45() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow9() {
  return (
    <div className="absolute h-[18px] left-0 top-[144px] w-[728.688px]" data-name="Table Row">
      <TableCell40 />
      <TableCell41 />
      <TableCell42 />
      <TableCell43 />
      <TableCell44 />
      <TableCell45 />
    </div>
  );
}

function TableCell46() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">10</p>
    </div>
  );
}

function TableCell47() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell48() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell49() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell50() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell51() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow10() {
  return (
    <div className="absolute h-[18px] left-0 top-[162px] w-[728.688px]" data-name="Table Row">
      <TableCell46 />
      <TableCell47 />
      <TableCell48 />
      <TableCell49 />
      <TableCell50 />
      <TableCell51 />
    </div>
  );
}

function TableCell52() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.3px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">11</p>
    </div>
  );
}

function TableCell53() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell54() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell55() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell56() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell57() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow11() {
  return (
    <div className="absolute h-[18px] left-0 top-[180px] w-[728.688px]" data-name="Table Row">
      <TableCell52 />
      <TableCell53 />
      <TableCell54 />
      <TableCell55 />
      <TableCell56 />
      <TableCell57 />
    </div>
  );
}

function TableCell58() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">12</p>
    </div>
  );
}

function TableCell59() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell60() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell61() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell62() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell63() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow12() {
  return (
    <div className="absolute h-[18px] left-0 top-[198px] w-[728.688px]" data-name="Table Row">
      <TableCell58 />
      <TableCell59 />
      <TableCell60 />
      <TableCell61 />
      <TableCell62 />
      <TableCell63 />
    </div>
  );
}

function TableCell64() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">13</p>
    </div>
  );
}

function TableCell65() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell66() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell67() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell68() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell69() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow13() {
  return (
    <div className="absolute h-[18px] left-0 top-[216px] w-[728.688px]" data-name="Table Row">
      <TableCell64 />
      <TableCell65 />
      <TableCell66 />
      <TableCell67 />
      <TableCell68 />
      <TableCell69 />
    </div>
  );
}

function TableCell70() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.75px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">14</p>
    </div>
  );
}

function TableCell71() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-[40px] top-0 w-[689px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[291px] not-italic text-[11px] text-neutral-950 text-nowrap top-px whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableRow14() {
  return (
    <div className="absolute h-[18px] left-0 top-[234px] w-[728.688px]" data-name="Table Row">
      <TableCell70 />
      <TableCell71 />
    </div>
  );
}

function TableCell72() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.75px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">15</p>
    </div>
  );
}

function TableCell73() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-[40px] top-0 w-[689px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[291px] not-italic text-[11px] text-neutral-950 text-nowrap top-px whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableRow15() {
  return (
    <div className="absolute h-[18px] left-0 top-[252px] w-[728.688px]" data-name="Table Row">
      <TableCell72 />
      <TableCell73 />
    </div>
  );
}

function TableCell74() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">16</p>
    </div>
  );
}

function TableCell75() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell76() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell77() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell78() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell79() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow16() {
  return (
    <div className="absolute h-[18px] left-0 top-[270px] w-[728.688px]" data-name="Table Row">
      <TableCell74 />
      <TableCell75 />
      <TableCell76 />
      <TableCell77 />
      <TableCell78 />
      <TableCell79 />
    </div>
  );
}

function TableCell80() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">17</p>
    </div>
  );
}

function TableCell81() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell82() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell83() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell84() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell85() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow17() {
  return (
    <div className="absolute h-[18px] left-0 top-[288px] w-[728.688px]" data-name="Table Row">
      <TableCell80 />
      <TableCell81 />
      <TableCell82 />
      <TableCell83 />
      <TableCell84 />
      <TableCell85 />
    </div>
  );
}

function TableCell86() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">18</p>
    </div>
  );
}

function TableCell87() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell88() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell89() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell90() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell91() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow18() {
  return (
    <div className="absolute h-[18px] left-0 top-[306px] w-[728.688px]" data-name="Table Row">
      <TableCell86 />
      <TableCell87 />
      <TableCell88 />
      <TableCell89 />
      <TableCell90 />
      <TableCell91 />
    </div>
  );
}

function TableCell92() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">19</p>
    </div>
  );
}

function TableCell93() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell94() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell95() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell96() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell97() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow19() {
  return (
    <div className="absolute h-[18px] left-0 top-[324px] w-[728.688px]" data-name="Table Row">
      <TableCell92 />
      <TableCell93 />
      <TableCell94 />
      <TableCell95 />
      <TableCell96 />
      <TableCell97 />
    </div>
  );
}

function TableCell98() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">20</p>
    </div>
  );
}

function TableCell99() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell100() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell101() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell102() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell103() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow20() {
  return (
    <div className="absolute h-[18px] left-0 top-[342px] w-[728.688px]" data-name="Table Row">
      <TableCell98 />
      <TableCell99 />
      <TableCell100 />
      <TableCell101 />
      <TableCell102 />
      <TableCell103 />
    </div>
  );
}

function TableCell104() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.75px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">21</p>
    </div>
  );
}

function TableCell105() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-[40px] top-0 w-[689px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[291px] not-italic text-[11px] text-neutral-950 text-nowrap top-px whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableRow21() {
  return (
    <div className="absolute h-[18px] left-0 top-[360px] w-[728.688px]" data-name="Table Row">
      <TableCell104 />
      <TableCell105 />
    </div>
  );
}

function TableCell106() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.75px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">22</p>
    </div>
  );
}

function TableCell107() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-[40px] top-0 w-[689px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[291px] not-italic text-[11px] text-neutral-950 text-nowrap top-px whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableRow22() {
  return (
    <div className="absolute h-[18px] left-0 top-[378px] w-[728.688px]" data-name="Table Row">
      <TableCell106 />
      <TableCell107 />
    </div>
  );
}

function TableCell108() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">23</p>
    </div>
  );
}

function TableCell109() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell110() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell111() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell112() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell113() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow23() {
  return (
    <div className="absolute h-[18px] left-0 top-[396px] w-[728.688px]" data-name="Table Row">
      <TableCell108 />
      <TableCell109 />
      <TableCell110 />
      <TableCell111 />
      <TableCell112 />
      <TableCell113 />
    </div>
  );
}

function TableCell114() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">24</p>
    </div>
  );
}

function TableCell115() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell116() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell117() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell118() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell119() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow24() {
  return (
    <div className="absolute h-[18px] left-0 top-[414px] w-[728.688px]" data-name="Table Row">
      <TableCell114 />
      <TableCell115 />
      <TableCell116 />
      <TableCell117 />
      <TableCell118 />
      <TableCell119 />
    </div>
  );
}

function TableCell120() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">25</p>
    </div>
  );
}

function TableCell121() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell122() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell123() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell124() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell125() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow25() {
  return (
    <div className="absolute h-[18px] left-0 top-[432px] w-[728.688px]" data-name="Table Row">
      <TableCell120 />
      <TableCell121 />
      <TableCell122 />
      <TableCell123 />
      <TableCell124 />
      <TableCell125 />
    </div>
  );
}

function TableCell126() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">26</p>
    </div>
  );
}

function TableCell127() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell128() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell129() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell130() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell131() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow26() {
  return (
    <div className="absolute h-[18px] left-0 top-[450px] w-[728.688px]" data-name="Table Row">
      <TableCell126 />
      <TableCell127 />
      <TableCell128 />
      <TableCell129 />
      <TableCell130 />
      <TableCell131 />
    </div>
  );
}

function TableCell132() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">27</p>
    </div>
  );
}

function TableCell133() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell134() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell135() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell136() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell137() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow27() {
  return (
    <div className="absolute h-[18px] left-0 top-[468px] w-[728.688px]" data-name="Table Row">
      <TableCell132 />
      <TableCell133 />
      <TableCell134 />
      <TableCell135 />
      <TableCell136 />
      <TableCell137 />
    </div>
  );
}

function TableCell138() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.75px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">28</p>
    </div>
  );
}

function TableCell139() {
  return (
    <div className="absolute bg-[#d1d5dc] h-[18px] left-[40px] top-0 w-[689px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[291px] not-italic text-[11px] text-neutral-950 text-nowrap top-px whitespace-pre">Weekly Holiday</p>
    </div>
  );
}

function TableRow28() {
  return (
    <div className="absolute h-[18px] left-0 top-[486px] w-[728.688px]" data-name="Table Row">
      <TableCell138 />
      <TableCell139 />
    </div>
  );
}

function TableCell140() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">29</p>
    </div>
  );
}

function TableCell141() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell142() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell143() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell144() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell145() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow29() {
  return (
    <div className="absolute h-[18px] left-0 top-[504px] w-[728.688px]" data-name="Table Row">
      <TableCell140 />
      <TableCell141 />
      <TableCell142 />
      <TableCell143 />
      <TableCell144 />
      <TableCell145 />
    </div>
  );
}

function TableCell146() {
  return (
    <div className="absolute h-[18px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[0.14px] translate-x-[-50%] whitespace-pre">30</p>
    </div>
  );
}

function TableCell147() {
  return (
    <div className="absolute h-[18px] left-[40px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell148() {
  return (
    <div className="absolute h-[18px] left-[120px] top-0 w-[80px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell149() {
  return (
    <div className="absolute h-[18px] left-[200px] top-0 w-[56px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell150() {
  return (
    <div className="absolute h-[18px] left-[256px] top-0 w-[376.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell151() {
  return (
    <div className="absolute h-[18px] left-[632.69px] top-0 w-[96px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow30() {
  return (
    <div className="absolute h-[18px] left-0 top-[522px] w-[728.688px]" data-name="Table Row">
      <TableCell146 />
      <TableCell147 />
      <TableCell148 />
      <TableCell149 />
      <TableCell150 />
      <TableCell151 />
    </div>
  );
}

function TableBody() {
  return (
    <div className="absolute h-[540px] left-px top-[24.88px] w-[728.688px]" data-name="Table Body">
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
    <div className="absolute h-[565.703px] left-[32px] top-[204.13px] w-[729.688px]" data-name="Table">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <TableHeader />
      <TableBody />
    </div>
  );
}

function Container11() {
  return (
    <div className="absolute h-[16px] left-[32px] top-[793.83px] w-[729.688px]" data-name="Container">
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16px] left-0 not-italic text-[12px] text-neutral-950 text-nowrap top-0 whitespace-pre">H.R Comments :</p>
    </div>
  );
}

function HeaderCell6() {
  return (
    <div className="absolute h-[20.703px] left-0 top-0 w-[40px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20.03px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[1.5px] translate-x-[-50%] whitespace-pre">Sl.</p>
    </div>
  );
}

function HeaderCell7() {
  return (
    <div className="absolute h-[20.703px] left-[40px] top-0 w-[192px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[8.5px] not-italic text-[11px] text-neutral-950 text-nowrap top-[1.5px] whitespace-pre">Particulars</p>
    </div>
  );
}

function HeaderCell8() {
  return (
    <div className="absolute h-[20.703px] left-[232px] top-0 w-[160px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[80.09px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[1.5px] translate-x-[-50%] whitespace-pre">Day/s, Hour, Minutes, Eligibility</p>
    </div>
  );
}

function HeaderCell9() {
  return (
    <div className="absolute h-[20.703px] left-[392px] top-0 w-[336.688px]" data-name="Header Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[168.45px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[1.5px] translate-x-[-50%] whitespace-pre">Remarks</p>
    </div>
  );
}

function TableRow31() {
  return (
    <div className="absolute h-[20.703px] left-0 top-0 w-[728.688px]" data-name="Table Row">
      <HeaderCell6 />
      <HeaderCell7 />
      <HeaderCell8 />
      <HeaderCell9 />
    </div>
  );
}

function TableHeader1() {
  return (
    <div className="absolute h-[20.703px] left-[0.5px] top-[0.5px] w-[728.688px]" data-name="Table Header">
      <TableRow31 />
    </div>
  );
}

function TableCell152() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[1.14px] translate-x-[-50%] whitespace-pre">01</p>
    </div>
  );
}

function TableCell153() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[8.5px] not-italic text-[11px] text-neutral-950 text-nowrap top-[1.14px] whitespace-pre">Sick Leave</p>
    </div>
  );
}

function TableCell154() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell155() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[336.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow32() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[728.688px]" data-name="Table Row">
      <TableCell152 />
      <TableCell153 />
      <TableCell154 />
      <TableCell155 />
    </div>
  );
}

function TableCell156() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[1.14px] translate-x-[-50%] whitespace-pre">02</p>
    </div>
  );
}

function TableCell157() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[8.5px] not-italic text-[11px] text-neutral-950 text-nowrap top-[1.14px] whitespace-pre">Casual Leave</p>
    </div>
  );
}

function TableCell158() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell159() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[336.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow33() {
  return (
    <div className="absolute h-[20px] left-0 top-[20px] w-[728.688px]" data-name="Table Row">
      <TableCell156 />
      <TableCell157 />
      <TableCell158 />
      <TableCell159 />
    </div>
  );
}

function TableCell160() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[1.14px] translate-x-[-50%] whitespace-pre">03</p>
    </div>
  );
}

function TableCell161() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[8.5px] not-italic text-[11px] text-neutral-950 text-nowrap top-[1.14px] whitespace-pre">Earn Leave</p>
    </div>
  );
}

function TableCell162() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell163() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[336.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow34() {
  return (
    <div className="absolute h-[20px] left-0 top-[40px] w-[728.688px]" data-name="Table Row">
      <TableCell160 />
      <TableCell161 />
      <TableCell162 />
      <TableCell163 />
    </div>
  );
}

function TableCell164() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[1.14px] translate-x-[-50%] whitespace-pre">04</p>
    </div>
  );
}

function TableCell165() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[8.5px] not-italic text-[11px] text-neutral-950 text-nowrap top-[1.14px] whitespace-pre">Late</p>
    </div>
  );
}

function TableCell166() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell167() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[336.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow35() {
  return (
    <div className="absolute h-[20px] left-0 top-[60px] w-[728.688px]" data-name="Table Row">
      <TableCell164 />
      <TableCell165 />
      <TableCell166 />
      <TableCell167 />
    </div>
  );
}

function TableCell168() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[1.14px] translate-x-[-50%] whitespace-pre">05</p>
    </div>
  );
}

function TableCell169() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[8.5px] not-italic text-[11px] text-neutral-950 text-nowrap top-[1.14px] whitespace-pre">Other Leave</p>
    </div>
  );
}

function TableCell170() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell171() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[336.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow36() {
  return (
    <div className="absolute h-[20px] left-0 top-[80px] w-[728.688px]" data-name="Table Row">
      <TableCell168 />
      <TableCell169 />
      <TableCell170 />
      <TableCell171 />
    </div>
  );
}

function TableCell172() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[1.14px] translate-x-[-50%] whitespace-pre">06</p>
    </div>
  );
}

function TableCell173() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[8.5px] not-italic text-[11px] text-neutral-950 text-nowrap top-[1.14px] whitespace-pre">Eligible for Attendance Bonus</p>
    </div>
  );
}

function TableCell174() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell175() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[336.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow37() {
  return (
    <div className="absolute h-[20px] left-0 top-[100px] w-[728.688px]" data-name="Table Row">
      <TableCell172 />
      <TableCell173 />
      <TableCell174 />
      <TableCell175 />
    </div>
  );
}

function TableCell176() {
  return (
    <div className="absolute h-[32.406px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[7.34px] translate-x-[-50%] whitespace-pre">07</p>
    </div>
  );
}

function TableCell177() {
  return (
    <div className="absolute h-[32.406px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[8.5px] not-italic text-[11px] text-neutral-950 top-[-0.5px] w-[149px]">Last Working day OT of Previous Month</p>
    </div>
  );
}

function TableCell178() {
  return (
    <div className="absolute h-[32.406px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell179() {
  return (
    <div className="absolute h-[32.406px] left-[392px] top-0 w-[336.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow38() {
  return (
    <div className="absolute h-[32.406px] left-0 top-[120px] w-[728.688px]" data-name="Table Row">
      <TableCell176 />
      <TableCell177 />
      <TableCell178 />
      <TableCell179 />
    </div>
  );
}

function TableCell180() {
  return (
    <div className="absolute h-[20px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[15.714px] left-[20px] not-italic text-[11px] text-center text-neutral-950 text-nowrap top-[1.14px] translate-x-[-50%] whitespace-pre">08</p>
    </div>
  );
}

function TableCell181() {
  return (
    <div className="absolute h-[20px] left-[40px] top-0 w-[192px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Times_New_Roman:Regular',sans-serif] leading-[15.714px] left-[8.5px] not-italic text-[11px] text-neutral-950 text-nowrap top-[1.14px] whitespace-pre">Total OT</p>
    </div>
  );
}

function TableCell182() {
  return (
    <div className="absolute h-[20px] left-[232px] top-0 w-[160px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableCell183() {
  return (
    <div className="absolute h-[20px] left-[392px] top-0 w-[336.688px]" data-name="Table Cell">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function TableRow39() {
  return (
    <div className="absolute h-[20px] left-0 top-[152.41px] w-[728.688px]" data-name="Table Row">
      <TableCell180 />
      <TableCell181 />
      <TableCell182 />
      <TableCell183 />
    </div>
  );
}

function TableBody1() {
  return (
    <div className="absolute h-[172.406px] left-[0.5px] top-[21.2px] w-[728.688px]" data-name="Table Body">
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
    <div className="absolute h-[194.109px] left-[32px] top-[813.83px] w-[729.688px]" data-name="Table">
      <div aria-hidden="true" className="absolute border border-black border-solid inset-0 pointer-events-none" />
      <TableHeader1 />
      <TableBody1 />
    </div>
  );
}

function Container12() {
  return (
    <div className="h-[21px] relative shrink-0 w-[160px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[1px_0px_0px] border-black border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[21px] relative w-[160px]">
        <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16px] left-[80.16px] not-italic text-[12px] text-center text-neutral-950 text-nowrap top-[5px] translate-x-[-50%] whitespace-pre">Checked By:</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="h-[21px] relative shrink-0 w-[160px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[1px_0px_0px] border-black border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[21px] relative w-[160px]">
        <p className="absolute font-['Times_New_Roman:Bold',sans-serif] leading-[16px] left-[80.09px] not-italic text-[12px] text-center text-neutral-950 text-nowrap top-[5px] translate-x-[-50%] whitespace-pre">Approved by:</p>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="absolute box-border content-stretch flex h-[53px] items-start justify-between left-[32px] pb-0 pt-[32px] px-0 top-[1071.94px] w-[729.688px]" data-name="Container">
      <Container12 />
      <Container13 />
    </div>
  );
}

export default function Container15() {
  return (
    <div className="bg-white relative shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] size-full" data-name="Container">
      <Container1 />
      <Container10 />
      <Table />
      <Container11 />
      <Table1 />
      <Container14 />
    </div>
  );
}
