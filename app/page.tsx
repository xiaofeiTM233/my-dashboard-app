export default function Home() {
  return (
    <div className="icon-s icon-home-small home h-full w-full">
      {/* === Video Background === */}
      <section className="home-wallpaper h-full w-full">
        <video
          className="h-full w-full object-cover"
          src="https://eo.hitfun.top/bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </section>

      {/* === Main Content Overlay === */}
      <div className="home-main absolute top-0 left-0 h-full w-full transition-transform duration-300">
        <section className="page-active absolute flex h-full w-full flex-col items-center">
          {/* === Clock Display === */}
          <div className="mt-[28.5vh] flex font-[family-name:var(--font-mind-demi-bold)] text-[130px] leading-[100px] text-[rgba(245,245,250,0.8)] max-md:text-[70px] max-md:leading-[70px]">
            <p className="flex-shrink-0 text-right">18</p>
            <span className="mx-2">:</span>
            <p className="flex-shrink-0 text-center">14</p>
            <span className="mx-2">:</span>
            <p className="w-[170px] flex-shrink-0 text-left max-md:w-[90px]">03</p>
          </div>

          {/* === Date Display === */}
          <p className="absolute top-[calc(28.5vh+128px)] font-[family-name:var(--font-mind-regular)] text-[32px] leading-[39px] text-[rgba(245,245,250,0.8)] max-md:top-[calc(28.5vh+80px)] max-md:text-[20px]">
            <span>2026年6月10日&nbsp;&nbsp;</span>
            <span>四月廿五&nbsp;&nbsp;</span>
            <span>星期三</span>
          </p>
        </section>

        {/* === Search Bar === */}
        <section
          className="absolute-center top-[12vh] w-[568px] max-w-[86vw] transition-opacity duration-100 focus-within:opacity-100"
          style={{ width: "567.6px" }}
        >
          <form
            className="border-opacity-10 bg-opacity-60 search-box flex h-[52px] items-center rounded-[12px] border-[1px] border-solid border-color-white bg-color-m1 transition-colors duration-100 focus-within:bg-opacity-80 focus-within:!opacity-100 w-full"
            style={{ opacity: 1 }}
          >
            {/* Search Engine Icon */}
            <div className="flex h-full w-[52px] items-center justify-center">
              <div className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[8px] bg-opacity-80 hover:bg-white/80">
                <section
                  className="flex items-center justify-center overflow-hidden bg-cover h-[24px] w-[24px] rounded-[6px]"
                  style={{
                    backgroundImage:
                      'url("https://static.wetab.link/user-custom-icon/zh/644b78ec2a77ac35cd5059c5/user-custom-icon1isknn3l5l3vhd0tb59123a90bv.png?imageMogr2/thumbnail/48x/format/webp/blur/1x0/quality/100|imageslim")',
                  }}
                />
              </div>
            </div>

            {/* Search Input */}
            <input
              tabIndex={1}
              className="h-full grow bg-transparent py-[12px] pl-[4px] pr-[42px] text-[16px] text-color-t1 placeholder:text-color-t1 placeholder:opacity-40 outline-none"
              type="search"
              placeholder="输入搜索内容"
              autoComplete="off"
            />
          </form>
        </section>
      </div>
    </div>
  );
}
